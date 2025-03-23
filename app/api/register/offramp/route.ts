import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { createRecipient, verifyBankAccount } from "@/lib/paystack-client"
import { prisma } from "@/lib/database"

export async function POST(request: Request) {
  try {
    const { userAddress, bankAccount, chainId, bankCode, accountName } = await request.json()

    if (!userAddress || !bankAccount) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const transactionId = `0x${randomBytes(32).toString("hex")}`

    const data = await verifyBankAccount(bankAccount, bankCode);

    const recipient = await createRecipient(
      data.account_name,
      data.account_number,
      bankCode,
      userAddress
    );

    const transaction = await prisma.transaction.create({
      data: {
        id: transactionId,
        type: 'offramp',
        userAddress,
        bankCode,
        chainId,
        bankAccount,
        recipientId: recipient.recipient_code,
        amount: 0,
        currency: 'NGN'
      }
    });

    return NextResponse.json({
      success: true,
      data: Object.assign(transaction, { recipient: recipient.recipient_code }),
    })
  } catch (error) {
    console.error("Error in offramp registration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
