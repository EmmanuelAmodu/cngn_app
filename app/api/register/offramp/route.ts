import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { createRecipient, verifyBankAccount } from "@/lib/paystack-client"
import { prisma } from "@/lib/database"

export async function POST(request: Request) {
  try {
    const { userAddress, bankAccount, chainId, bankCode } = await request.json()

    if (!userAddress || !bankAccount) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const offrampId = `0x${randomBytes(32).toString("hex")}`

    const data = await verifyBankAccount(bankAccount, bankCode);

    const recipient = await createRecipient(
      data.account_name,
      data.account_number,
      bankCode,
      userAddress
    );

    const offramp = await prisma.offramp.create({
      data: {
        offrampId,
        userAddress,
        bankCode,
        chainId,
        bankAccount,
        recipientId: recipient.recipient_code,
        amount: 0,
      }
    });

    return NextResponse.json({
      success: true,
      data: Object.assign(offramp, { recipient: recipient.recipient_code }),
    })
  } catch (error) {
    console.error("Error in offramp registration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
