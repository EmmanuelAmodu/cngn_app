import { NextResponse } from "next/server"
import crypto from "crypto"
import type { NumeroVirtualAccountRequest } from "@/lib/types/numero"

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
    const data: NumeroVirtualAccountRequest = await request.json()
    console.log("Received virtual account creation request:", {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      mobileNumber: data.mobileNumber ? "REDACTED" : "MISSING",
    })

    if (!data.firstName || !data.lastName || !data.email || !data.mobileNumber) {
      console.error("Missing required fields for virtual account creation:", {
        firstName: !data.firstName,
        lastName: !data.lastName,
        email: !data.email,
        mobileNumber: !data.mobileNumber,
      })
      return NextResponse.json({ error: "Missing required fields for virtual account creation" }, { status: 400 })
    }

    const payload = JSON.stringify(data)
    const signature = generateSignature(payload)

    console.log(`Calling Numero API at ${NUMERO_API_URL}/virtualaccount/customer`)

    try {
      const response = await fetch(`${NUMERO_API_URL}/virtualaccount/customer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": NUMERO_API_KEY,
          "X-Signature": signature,
        },
        body: payload,
      })

      const responseText = await response.text()
      console.log(`Numero API response status: ${response.status}`)

      let responseData
      try {
        responseData = JSON.parse(responseText)
        console.log("Numero API response parsed successfully")
      } catch (e) {
        console.error("Failed to parse Numero API response:", responseText)
        return NextResponse.json({ error: "Invalid response from payment provider" }, { status: 500 })
      }

      if (!response.ok) {
        console.error("Numero API error:", responseData)
        return NextResponse.json(
          { error: responseData.message || "Failed to create virtual account" },
          { status: response.status },
        )
      }

      console.log("Virtual account created successfully")
      return NextResponse.json(responseData)
    } catch (fetchError) {
      console.error("Network error calling Numero API:", fetchError)
      return NextResponse.json({ error: "Failed to connect to payment provider" }, { status: 503 })
    }
  } catch (error) {
    console.error("Error creating virtual account:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

