import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { accountNumber, bankName } = await request.json()

    if (!accountNumber || !bankName) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // In a real implementation, this would call your banking provider's API
    // For now, we'll simulate a successful verification
    const accountName = `Test Account ${accountNumber.slice(-4)}`

    return NextResponse.json({
      accountNumber,
      accountName,
      bankName,
      isValid: true,
    })
  } catch (error) {
    console.error("Error in bank account verification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

