import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { verifyTransaction } from "@/lib/numero-client";
import {
  publicClient,
  getWalletClient,
  getContractAddress,
  contractABI,
  getChain,
  getPublicClient,
} from "@/lib/blockchain"
import type { Address } from "viem"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bankReference, userAddress, amount, onrampId, chainId = 1 } = body

    console.log("Received webhook payload:", { bankReference, userAddress, amount, onrampId, chainId })

    // Validate all required fields
    if (!bankReference || !userAddress || !amount || !onrampId) {
      return NextResponse.json(
        {
          error: `Missing required fields: ${[
            !bankReference && "bankReference",
            !userAddress && "userAddress",
            !amount && "amount",
            !onrampId && "onrampId",
          ]
            .filter(Boolean)
            .join(", ")}`,
        },
        { status: 400 },
      )
    }

    // Validate address format
    if (typeof userAddress !== "string" || !userAddress.startsWith("0x")) {
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 })
    }

    // Validate amount
    if (typeof amount !== "string" || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // Verify the transaction first
    console.log("Verifying transaction with Numero API...")
    const isVerified = await verifyTransaction(bankReference)

    if (!isVerified) {
      return NextResponse.json(
        {
          error: "Transaction not found or not completed. Please wait for the transaction to be confirmed.",
        },
        { status: 400 },
      )
    }

    console.log("Transaction verified successfully")

    console.log("Saving deposit to Supabase...")

    // Save deposit to Supabase with correct field names
    const { error: insertError, data: deposit } = await supabaseAdmin
      .from("deposits")
      .insert({
        bank_reference: bankReference,
        user_address: userAddress,
        amount: Number(amount),
        onramp_id: onrampId,
        chain_id: chainId,
        status: "processing", // Using one of the allowed status values
      })
      .select()
      .single()

    if (insertError) {
      console.error("Supabase insert error:", insertError)
      throw insertError
    }

    console.log("Deposit saved successfully:", deposit)

    try {
      // Get wallet client for the specified chain
      const walletClient = getWalletClient(chainId)
      if (!walletClient) {
        throw new Error("Wallet client not initialized")
      }

      console.log(`Executing deposit transaction on chain ${chainId}...`)

      // Convert amount to BigInt with proper decimal places (18 decimals for ERC20)
      const amountInWei = BigInt(Number(amount) * 10 ** 18)

      if (!walletClient.account) {
        throw new Error("Wallet client account not initialized")
      }

      // Get the chain for the specified chainId
      const chain = getChain(chainId)

      // Execute deposit transaction
      const txHash = await walletClient.writeContract({
        address: getContractAddress(chainId),
        abi: contractABI,
        account: walletClient.account,
        functionName: "deposit",
        args: [userAddress as Address, amountInWei, onrampId as `0x${string}`],
        chain,
      })

      console.log("Transaction submitted:", txHash)

      // Get the public client for the specified chain
      const client = publicClient.chain.id === chainId ? publicClient : getPublicClient(chainId)

      const receipt = await client.waitForTransactionReceipt({ hash: txHash })
      console.log("Transaction confirmed:", receipt)

      // Update deposit status in Supabase
      await supabaseAdmin
        .from("deposits")
        .update({
          status: "completed",
          bank_payment_reference: txHash, // Store the transaction hash in the bank_payment_reference field
        })
        .eq("id", deposit.id)

      return NextResponse.json({
        success: true,
        depositId: deposit.id,
        txHash,
      })
    } catch (error) {
      console.error("Deposit transaction failed:", error)

      // Update deposit status to failed
      await supabaseAdmin
        .from("deposits")
        .update({
          status: "failed",
        })
        .eq("id", deposit.id)

      return NextResponse.json(
        {
          error: "Deposit transaction failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in deposit webhook:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

