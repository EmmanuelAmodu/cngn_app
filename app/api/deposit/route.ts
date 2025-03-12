import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  publicClient,
  getWalletClient,
  getContractAddress,
  contractABI,
  getChain,
  getPublicClient,
} from "@/lib/blockchain";
import type { Address, Hex } from "viem";
import Bull, { type Job } from "bull";
import { randomBytes } from "crypto";
import { getCustomerTransactions } from "@/lib/paystack-client";

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
          !chainId && "onrampId",
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

  const {  data: accountData, error: accountDataError } = await supabaseAdmin
    .from("virtual_accounts")
    .select("*")
    .eq("user_address", userAddress)
    .single();

  if (accountDataError) {
    console.error("Error fetching account data:", accountDataError);
    return NextResponse.json(
      { error: "Failed to fetch account data" },
      { status: 500 }
    );
  }

  await getUsersLatestTransaction(userAddress, Number(accountData.reference));

  const { error: fetchError, data: deposits } = await supabaseAdmin
    .from("onramps")
    .select("*")
    .eq("user_address", userAddress)
    .eq("status", "pending");

  if (fetchError) {
    console.error("Error fetching deposits:", fetchError);
    return NextResponse.json(
      { error: "Failed to fetch deposits" },
      { status: 500 }
    );
  }

  await onrampQueue.add({ userAddress, chainId });

  return NextResponse.json({
    success: true,
    data: deposits,
  });
}

onrampQueue.process(processOffRamp);

async function processOffRamp(job: Job) {
  try {
    const { userAddress, chainId } = job.data;

    console.log("Updating onramps in Supabase...");
    const { error: fetchError, data: deposits } = await supabaseAdmin
      .from("onramps")
      .update({
        status: "processing",
        chain_id: Number(chainId),
      })
      .eq("user_address", userAddress)
      .eq("status", "pending")
      .select("*");

    if (fetchError) {
      console.error("Error fetching deposits:", fetchError);
      throw fetchError;
    }

    console.log("onramps updated successfully");

    for (let i = 0; i < deposits.length; i++) {
      await commitOnChain(
        Number(chainId),
        deposits[i].amount,
        userAddress as Hex,
        deposits[i].onramp_id
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
  try {
    // Get wallet client for the specified chain
    const walletClient = getWalletClient(chainId);
    if (!walletClient) {
      throw new Error("Wallet client not initialized");
    }

    console.log(`Executing deposit transaction on chain ${chainId}...`);

    // Convert amount to BigInt with proper decimal places (18 decimals for ERC20)
    const amountInWei = BigInt(amount * 10 ** 18);

    if (!walletClient.account) {
      throw new Error("Wallet client account not initialized");
    }

    // Get the chain for the specified chainId
    const chain = getChain(Number(chainId) || 1);

    // Execute deposit transaction
    const txHash = await walletClient.writeContract({
      address: getContractAddress(Number(chainId) || 1),
      abi: contractABI,
      account: walletClient.account,
      functionName: "deposit",
      args: [userAddress as Address, amountInWei, onrampId],
      chain,
    });

    console.log("Transaction submitted:", txHash);

    // Get the public client for the specified chain
    const client =
      publicClient.chain.id === Number(chainId)
        ? publicClient
        : getPublicClient(Number(chainId));

    const receipt = await client.waitForTransactionReceipt({ hash: txHash });
    console.log("Transaction confirmed:", receipt);

    // Update deposit status in Supabase
    await supabaseAdmin
      .from("onramps")
      .update({
        status: "completed",
        on_chain_tx: txHash, // Store the transaction hash in the bank_payment_reference field
      })
      .eq("onramp_id", onrampId);
  } catch (error) {
    console.error("Deposit transaction failed:", error);

    // Update deposit status to failed
    await supabaseAdmin
      .from("onramps")
      .update({
        status: "failed",
      })
      .eq("onramp_id", onrampId);

    throw error;
  }
}

async function getUsersLatestTransaction(userAddress: string, customerId: number) {
  const response = await getCustomerTransactions(customerId);

  for (const transaction of response) {
    const { status, amount, id } = transaction;
    if (status !== "success") {
      continue;
    }

    const { data } = await supabaseAdmin
      .from("onramps")
      .select("onramp_id")
      .eq("payment_reference", id)
      .single();

    if (data) continue;
    const { error: createError } = await supabaseAdmin.from("onramps").insert({
      onramp_id: `0x${randomBytes(32).toString("hex")}`,
      payment_reference: id,
      user_address: userAddress,
      amount,
    });

    if (createError) {
      console.error("Error saving onramp:", createError);
      throw createError;
    }
  }
}
