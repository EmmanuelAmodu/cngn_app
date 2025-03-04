import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { publicClient, getWalletClient, CONTRACT_ADDRESS, contractABI } from "@/lib/blockchain"
import type { Address } from "viem"
import crypto from "crypto"

const NUMERO_API_URL = process.env.NUMERO_API_URL || "https://api.numero.co"
const NUMERO_API_KEY = process.env.NUMERO_API_KEY
const NUMERO_API_SECRET = process.env.NUMERO_API_SECRET

if (!NUMERO_API_KEY || !NUMERO_API_SECRET) {
  throw new Error("Numero API credentials not configured")
}

function generateSignature(payload: string): string {
  return crypto.createHmac("sha256", NUMERO_API_SECRET!).update(payload).digest("hex")
}

async function verifyTransaction(reference: string): Promise<boolean> {
  try {
    // Get current date and 24 hours ago
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Prepare the request
    const url = `${NUMERO_API_URL}/transaction?startDate=${startDate}&endDate=${endDate}&searchBy=${reference}`
    const signature = generateSignature(url)

    const response = await fetch(url, {
      headers: {
        "X-Api-Key": NUMERO_API_KEY,
        "X-Signature": signature,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to verify transaction")
    }

    const data = await response.json()

    // Check if the transaction exists and is successful
    const transaction = data.data.transactions.find(
      (tx: any) => tx.reference === reference && tx.status === "Successful" && tx.requestState === "Completed",
    )

    return !!transaction
  } catch (error) {
    console.error("Error verifying transaction:", error)
    return false
  }
}

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
    if (typeof amount !== "string" || isNaN(Number(amount)) || Number(amount) <= 0) {
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
      // Get wallet client
      const walletClient = getWalletClient()
      if (!walletClient) {
        throw new Error("Wallet client not initialized")
      }

      console.log("Executing deposit transaction...")

      // Convert amount to BigInt with proper decimal places (18 decimals for ERC20)
      const amountInWei = BigInt(Number(amount) * 10 ** 18)

      // Execute deposit transaction
      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "deposit",
        args: [userAddress as Address, amountInWei, onrampId as `0x${string}`],
      })

      console.log("Transaction submitted:", txHash)

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
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
    } catch (error: any) {
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
          details: error.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Error in deposit webhook:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

