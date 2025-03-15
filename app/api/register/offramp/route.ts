import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { randomBytes } from "crypto"
import { createRecipient, verifyBankAccount } from "@/lib/paystack-client"

export async function POST(request: Request) {
  try {
    const { userAddress, bankAccount, chainId, bankCode } = await request.json()

    if (!userAddress || !bankAccount) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const offRampId = `0x${randomBytes(32).toString("hex")}`

    const data = await verifyBankAccount(bankAccount, bankCode);

    const recipient = await createRecipient(
      data.account_name,
      data.account_number,
      bankCode,
      userAddress
    );

    const { error, data: offramp } = await supabaseAdmin
      .from("offramps")
      .insert({
        offramp_id: offRampId,
        user_address: userAddress,
        account_number: data.account_number,
        account_name: data.account_name,
        bank_code: bankCode,
        chain_id: chainId,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: Object.assign(offramp, { recipient: recipient.recipient_code }),
    })
  } catch (error) {
    console.error("Error in offramp registration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
