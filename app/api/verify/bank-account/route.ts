import { NextResponse } from "next/server"
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

export async function POST(request: Request) {
  try {
    const { accountNumber, bankCode, amount } = await request.json()

    if (!accountNumber || !bankCode) {
      return NextResponse.json({ error: "Account number and bank code are required" }, { status: 400 })
    }

    // Prepare the request payload
    const payload = JSON.stringify({
      accountNumber,
      bankCode,
      amount: amount || 1000.0, // Use provided amount or default to 1000
    })

    // Generate signature
    const signature = generateSignature(payload)

    // Call Numero API to validate account
    const response = await fetch(`${NUMERO_API_URL}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": NUMERO_API_KEY,
        "X-Signature": signature,
      },
      body: payload,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to validate account")
    }

    const data = await response.json()

    if (!data.status) {
      throw new Error(data.message || "Account validation failed")
    }

    return NextResponse.json({
      status: true,
      message: "Account validated successfully",
      data: {
        accountNumber: data.data.accountNumber,
        accountName: data.data.accountName,
        bankCode: data.data.bankCode,
        fees: data.data.fees,
        isValid: true,
      },
    })
  } catch (error) {
    console.error("Error in bank account validation:", error)
    return NextResponse.json(
      {
        error: "Failed to validate bank account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

