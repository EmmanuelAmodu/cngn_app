import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { data: withdrawal, error } = await supabaseAdmin
      .from("withdrawals")
      .select(
        `
        *,
        offramps (
          bank_account
        )
      `,
      )
      .eq("id", params.id)
      .single()

    if (error) throw error

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: withdrawal.id,
      status: withdrawal.status,
      amount: withdrawal.amount,
      bankTransferReference: withdrawal.bank_transfer_reference,
      createdAt: withdrawal.created_at,
      updatedAt: withdrawal.updated_at,
    })
  } catch (error) {
    console.error("Error getting withdrawal status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

