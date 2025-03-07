import { NextResponse } from "next/server"
import crypto from "crypto"

const NUMERO_API_URL = process.env.NUMERO_API_URL || "https://api.numero.co"
const NUMERO_API_KEY = process.env.NUMERO_API_KEY
const NUMERO_API_SECRET = process.env.NUMERO_API_SECRET

if (!NUMERO_API_KEY || !NUMERO_API_SECRET) {
  throw new Error("Numero API credentials not configured")
}

function generateSignature(payload: string): string {
  if (!NUMERO_API_SECRET) {
    throw new Error("Numero API secret not configured")
  }

  return crypto.createHmac("sha256", NUMERO_API_SECRET).update(payload).digest("hex")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, destinationAccountNumber, destinationBankCode, destinationAccountName } = body

    if (!amount || !destinationAccountNumber || !destinationBankCode || !destinationAccountName) {
      return NextResponse.json({ error: "Missing required fields for fund transfer" }, { status: 400 })
    }

    // Generate a validation code
    const validationCode = `TRF${Date.now().toString().slice(-8)}`

    // Prepare the request payload
    const payload = JSON.stringify({
      validationCode,
      narration: "cNGN Offramp Payment",
      amount: amount,
      destinationAccountNumber,
      destinationBankCode,
      destinationAccountName,
      phoneNumber: "", // Optional in this implementation
    })

    // Generate signature
    const signature = generateSignature(payload)

    // Make the API call to Numero
    if (!NUMERO_API_KEY) {
      throw new Error("Numero API key not configured")
    }

    const response = await fetch(`${NUMERO_API_URL}/single`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": NUMERO_API_KEY,
        "X-Signature": signature,
      },
      body: payload,
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.message || "Fund transfer failed" }, { status: response.status })
    }

    const responseData = await response.json()

    if (!responseData.status) {
      return NextResponse.json({ error: responseData.message || "Fund transfer failed" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      transferReference: responseData.data.transferReference,
      message: "Transfer successful",
    })
  } catch (error) {
    console.error("Error in fund transfer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

