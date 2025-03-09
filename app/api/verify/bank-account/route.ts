import { verifyBankAccount } from "@/lib/flutterwave-client"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { accountNumber, bankCode } = await request.json()

    if (!accountNumber || !bankCode) {
      return NextResponse.json({ error: "Account number and bank code are required" }, { status: 400 })
    }

    const data = await verifyBankAccount(accountNumber, bankCode)

    return NextResponse.json({
      status: true,
      message: "Account validated successfully",
      data: {
        accountNumber: data.account_number,
        accountName: data.account_name,
        bankCode,
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
