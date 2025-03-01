import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    // Get deposits data with count
    const { count: depositCount, error: depositsError } = await supabaseAdmin
      .from("deposits")
      .select("amount", { count: 'exact', head: true })

    if (depositsError) throw depositsError

    // Get withdrawals data with count
    const { count: withdrawalCount, error: withdrawalsError } = await supabaseAdmin
      .from("withdrawals")
      .select("*", { count: 'exact', head: true })

    if (withdrawalsError) throw withdrawalsError

    // Get bridges data with count
    const { count: bridgeCount, error: bridgesError } = await supabaseAdmin
      .from("bridges")
      .select("*", { count: 'exact', head: true })

    if (bridgesError) throw bridgesError

    // Get sums separately for efficiency
    const { data: depositSum, error: depositSumError } = await supabaseAdmin
      .from("deposits")
      .select("amount")

    if (depositSumError) throw depositSumError

    const { data: withdrawalSum, error: withdrawalSumError } = await supabaseAdmin
      .from("withdrawals")
      .select("amount")

    if (withdrawalSumError) throw withdrawalSumError

    const { data: bridgeSum, error: bridgeSumError } = await supabaseAdmin
      .from("bridges")
      .select("amount")

    if (bridgeSumError) throw bridgeSumError

    // Calculate totals
    const onrampVolume = depositSum?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0
    const offrampVolume = withdrawalSum?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0
    const bridgeVolume = bridgeSum?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0
    const totalTransactions = (depositCount || 0) + (withdrawalCount || 0) + (bridgeCount || 0)

    return NextResponse.json({
      onrampVolume: onrampVolume.toString(),
      offrampVolume: offrampVolume.toString(),
      bridgeVolume: bridgeVolume.toString(),
      totalTransactions,
    })
  } catch (error) {
    console.error("Error getting transaction stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

