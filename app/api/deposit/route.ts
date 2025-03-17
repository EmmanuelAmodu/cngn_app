import { NextResponse } from "next/server";
import {
  getWalletClient,
  getContractAddress,
  contractABI,
  getChain,
  getPublicClient,
  getTokenAddress,
} from "@/lib/blockchain";
import { erc20Abi, type TransactionReceipt, type Address, type Hex } from "viem";
import Bull, { type Job } from "bull";
import { randomBytes } from "crypto";
import { getCustomerTransactions } from "@/lib/paystack-client";
import { prisma } from "@/lib/database";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error("Redis URL not defined");
}

const onrampQueue = new Bull("onramp_queue", {
  redis: REDIS_URL,
});

export async function POST(request: Request) {
  const body = await request.json();
  const { userAddress, chainId } = body;

  // Validate all required fields
  if (!chainId || !userAddress) {
    return NextResponse.json(
      {
        error: `Missing required fields: ${[
          !userAddress && "userAddress",
          !chainId && "chainId",
        ]
          .filter(Boolean)
          .join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Validate address format
  if (typeof userAddress !== "string" || !userAddress.startsWith("0x")) {
    return NextResponse.json(
      { error: "Invalid wallet address format" },
      { status: 400 }
    );
  }

  // Validate amount
  if (
    Number.isNaN(Number(chainId)) ||
    Number(chainId) <= 0
  ) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const accountData = await prisma.virtualAccount.findFirst({
    where: { userAddress },
  });

  if (!accountData) {
    return NextResponse.json(
      { error: "User account not found" },
      { status: 404 }
    );
  }

  console.log("Fetching user's latest transaction...", accountData);
  await getUsersLatestTransaction(userAddress, accountData.reference);

  const onramps = await prisma.onramp.findMany({
    where: { chainId, userAddress},
  });

  await onrampQueue.add({ userAddress, chainId });

  return NextResponse.json({
    success: true,
    data: onramps,
  });
}

onrampQueue.process(processOffRamp);

async function processOffRamp(job: Job) {
  try {
    const { userAddress, chainId } = job.data;

    console.log("Updating onramps in database...");
    const onramps = await prisma.onramp.findMany({
      where: {
        userAddress,
        status: 'pending'
      }
    })

    await prisma.onramp.updateMany({
      where: {
        onrampId: { in: onramps.map(e => e.onrampId) }
      },
      data: {
        status: "processing",
        chainId: Number(chainId),
      }
    })

    console.log("onramps updated successfully");

    for (let i = 0; i < onramps.length; i++) {
      await commitOnChain(
        Number(chainId),
        onramps[i].amount,
        userAddress as Hex,
        onramps[i].onrampId as Hex
      );
    }
  } catch (error) {
    console.error("Error in deposit webhook:", error);
    throw error;
  }
}

async function commitOnChain(
  chainId: number,
  amount: number,
  userAddress: Address,
  onrampId: Hex
) {
  const walletClient = getWalletClient(chainId);
  const publicClient = getPublicClient(chainId);

  console.log(`Executing deposit transaction on chain ${chainId}...`);

  const decimals = await publicClient.readContract({
    address: getTokenAddress(Number(chainId)),
    functionName: 'decimals',
    abi: erc20Abi
  });

  // Convert amount to BigInt with proper decimal places (18 decimals for ERC20)
  const amountMinusFees = amount - 50;
  const amountInWei = BigInt(amountMinusFees * 10 ** decimals);

  if (!walletClient.account) {
    throw new Error("Wallet client account not initialized");
  }

  if (amountInWei <= 0) {
    throw new Error("Invalid amount");
  }

  // Get the chain for the specified chainId
  const chain = getChain(Number(chainId) || 1);

  let txHash: Hex;
  let receipt: TransactionReceipt;
  try {
    // Execute deposit transaction
    txHash = await walletClient.writeContract({
      address: getContractAddress(Number(chainId)),
      abi: contractABI,
      account: walletClient.account,
      functionName: "onRamp",
      args: [userAddress as Address, amountInWei, onrampId],
      chain,
    });

    console.log("Transaction submitted:", txHash);

    // Get the public client for the specified chain
    const client = getPublicClient(Number(chainId));

    receipt = await client.waitForTransactionReceipt({ hash: txHash });
    console.log("Transaction confirmed:", receipt);
  } catch (error) {
    console.error("Deposit transaction failed:", error);
    throw error;
  }

  if (txHash && receipt) {
    await prisma.onramp.update({
      where: { onrampId },
      data: {
        status: "completed",
        onChainTx: txHash,
      }
    });
  }
}

async function getUsersLatestTransaction(userAddress: string, customerId: string) {
  const response = await getCustomerTransactions(customerId);

  console.log('User transactions', userAddress, customerId, response)
  for (const transaction of response) {
    const { status, amount, id } = transaction;
    if (status !== "success") {
      continue;
    }

    const data = await prisma.onramp.findFirst({
      where: { paymentReference: id.toString() },
    });

    if (data) continue;

    await prisma.onramp.create({
      data: {
        onrampId: `0x${randomBytes(32).toString("hex")}`,
        paymentReference: id.toString(),
        userAddress,
        amount: amount / 100,
      }
    });
  }
}
