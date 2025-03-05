import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { randomBytes } from "crypto"

export async function POST(request: Request) {
  try {
    const { userAddress, bankAccount, chainId = 1 } = await request.json()

    if (!userAddress || !bankAccount) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const offRampId = `0x${randomBytes(32).toString("hex")}`

    const { error, data: offramp } = await supabaseAdmin
      .from("offramps")
      .insert({
        offramp_id: offRampId,
        user_address: userAddress,
        bank_account: bankAccount, // This now contains the full bank details including phone number
        chain_id: chainId,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      offRampId: offramp.offramp_id,
    })
  } catch (error) {
    console.error("Error in offramp registration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

