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

export async function GET(request: Request) {
  // Validate all required fields
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get("userAddress");
  const chainId = Number(searchParams.get("chainId"));

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
    Number.isNaN(chainId) ||
    chainId <= 0
  ) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const accountData = await prisma.virtualAccount.findFirst({
    where: { userAddress: userAddress },
  });

  if (!accountData) {
    return NextResponse.json(
      { error: "User account not found" },
      { status: 404 }
    );
  }

  console.log("Fetching user's latest transaction...", accountData);
  await getUsersLatestTransaction(userAddress, accountData.reference);

  const transactions = await prisma.transaction.findMany({
    where: { 
      userAddress, 
      chainId,
      type: 'onramp'
    },
    orderBy: { createdAt: "desc" },
  });

  await onrampQueue.add({ userAddress, chainId });

  return NextResponse.json({
    success: true,
    data: transactions,
  });
}

onrampQueue.process(processOffRamp);

async function processOffRamp(job: Job) {
  try {
    const { userAddress, chainId } = job.data;

    console.log("Updating transactions in database...");
    const transactions = await prisma.transaction.findMany({
      where: {
        userAddress,
        status: 'pending',
        type: 'onramp'
      }
    })

    await prisma.transaction.updateMany({
      where: {
        id: { in: transactions.map(e => e.id) }
      },
      data: {
        status: "processing",
        chainId: Number(chainId),
      }
    })

    console.log("transactions updated successfully");

    for (let i = 0; i < transactions.length; i++) {
      await commitOnChain(
        Number(chainId),
        transactions[i].amount,
        userAddress as Hex,
        transactions[i].id as Hex
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
  transactionId: Hex
) {
  const walletClient = getWalletClient(chainId);
  const publicClient = getPublicClient(chainId);

  console.log(`Executing deposit transaction on chain ${chainId}...`);

  const decimals = await publicClient.readContract({
    address: getTokenAddress(Number(chainId)),
    functionName: 'decimals',
    abi: erc20Abi
  });

  const contractAddress = getContractAddress(Number(chainId));

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
    const balance = await publicClient.readContract({
      address: getTokenAddress(Number(chainId)),
      functionName: 'balanceOf',
      abi: erc20Abi,
      args: [contractAddress],
    })

    if (balance < amountInWei) {
      throw new Error("Insufficient balance in contract");
    }

    // Execute deposit transaction
    txHash = await walletClient.writeContract({
      address: getContractAddress(Number(chainId)),
      abi: contractABI,
      account: walletClient.account,
      functionName: "onRamp",
      args: [userAddress as Address, amountInWei, transactionId],
      chain,
    });

    console.log("Transaction submitted:", txHash);

    // Get the public client for the specified chain
    const client = getPublicClient(Number(chainId));

    receipt = await client.waitForTransactionReceipt({ hash: txHash });
    console.log("Transaction confirmed:", receipt);
  } catch (error) {
    console.error("Deposit transaction failed:", error);
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "pending",
      }
    });
    throw error;
  }

  if (txHash && receipt) {
    await prisma.transaction.update({
      where: { id: transactionId },
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

    const data = await prisma.transaction.findFirst({
      where: { paymentReference: id.toString() },
    });

    if (data) continue;

    await prisma.transaction.create({
      data: {
        id: `0x${randomBytes(32).toString("hex")}`,
        type: 'onramp',
        paymentReference: id.toString(),
        userAddress,
        amount: amount / 100,
        currency: 'NGN'
      }
    });
  }
}
