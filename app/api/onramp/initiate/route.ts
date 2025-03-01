import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { supabaseAdmin } from "@/lib/supabase"

// Simulate banking provider API
async function getVirtualAccount(userAddress: string) {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return {
    virtualAccount: `${userAddress.slice(2, 8)}${Math.floor(Math.random() * 10000)}`,
    accountName: "John Doe",
    bankName: "TEST BANK",
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userAddress, amount } = body

    if (!userAddress || !amount) {
      return NextResponse.json({ error: "Missing required fields: userAddress and amount" }, { status: 400 })
    }

    if (typeof amount !== "string" || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount provided" }, { status: 400 })
    }

    if (typeof userAddress !== "string" || !userAddress.startsWith("0x")) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
    }

    // Generate onrampId
    const onrampId = `0x${randomBytes(32).toString("hex")}`

    // Get virtual account details
    const { virtualAccount, bankName, accountName } = await getVirtualAccount(userAddress)

    // Save to Supabase
    const { error } = await supabaseAdmin.from("onramp_requests").insert({
      onramp_id: onrampId,
      user_address: userAddress,
      virtual_account: virtualAccount,
      bank_name: bankName,
      account_name: accountName,
    })

    if (error) throw error

    return NextResponse.json({
      success: true,
      onrampId,
      virtualAccount,
      bankName,
      accountName,
    })
  } catch (error) {
    console.error("Error in onramp initiate:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

