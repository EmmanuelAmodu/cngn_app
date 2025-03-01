import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { publicClient, getWalletClient, CONTRACT_ADDRESS, contractABI } from "@/lib/blockchain"
import type { Address } from "viem"
import { mainnet } from "viem/chains"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bankReference, userAddress, amount, onrampId } = body

    console.log("Received webhook payload:", { bankReference, userAddress, amount, onrampId })

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

    console.log("Saving deposit to Supabase...")

    // Save deposit to Supabase
    const { error: insertError, data: deposit } = await supabaseAdmin
      .from("deposits")
      .insert({
        bank_reference: bankReference,
        user_address: userAddress,
        amount: Number(amount),
        onramp_id: onrampId,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Supabase insert error:", insertError)
      throw insertError
    }

    console.log("Deposit saved successfully:", deposit)

    try {
      // Get wallet client
      const walletClient = getWalletClient()
      if (!walletClient) {
        throw new Error("Wallet client not initialized")
      }

      console.log("Executing deposit transaction...")

      // Convert amount to BigInt with proper decimal places (18 decimals for ERC20)
      const amountInWei = BigInt(Number(amount) * 10 ** 18)

      if (!walletClient.account) {
        throw new Error("Wallet client account not initialized")
      }

      // Execute deposit transaction
      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        account: walletClient.account,
        functionName: "deposit",
        args: [userAddress as Address, amountInWei, onrampId as `0x${string}`],
        chain: mainnet,
      })

      console.log("Transaction submitted:", txHash)

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log("Transaction confirmed:", receipt)

      return NextResponse.json({
        success: true,
        depositId: deposit.id,
        txHash,
      })
    } catch (error) {
      console.error("Deposit transaction failed:", error)
      return NextResponse.json(
        {
          error: "Deposit transaction failed",
          details: (error as { message: unknown }).message,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in deposit webhook:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: (error as { message: unknown }).message,
      },
      { status: 500 },
    )
  }
}

