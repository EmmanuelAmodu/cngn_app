import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
  try {
    const { amount, sourceChain, destinationChain } = await request.json()

    if (!amount || !sourceChain || !destinationChain) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const bridgeId = randomUUID()

    const { error } = await supabase.from("bridges").insert({
      id: bridgeId,
      user_address: "0x", // This should come from the authenticated user
      amount: Number.parseInt(amount),
      destination_chain_id: 1, // This should be properly mapped from destinationChain
      processed: false,
    })

    if (error) throw error

    return NextResponse.json({
      success: true,
      bridgeId,
    })
  } catch (error) {
    console.error("Error in bridge initiation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

