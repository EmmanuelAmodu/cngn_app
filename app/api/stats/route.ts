import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    // Default values in case of database errors
    let depositCount = 0
    let withdrawalCount = 0
    let bridgeCount = 0
    let onrampVolume = 0
    let offrampVolume = 0
    let bridgeVolume = 0

    // Try to get deposits data with count
    try {
      const { count, error } = await supabaseAdmin
        .from("onramps")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")

      if (!error) {
        depositCount = count || 0
      }
    } catch (error) {
      console.error("Error fetching deposit count:", error)
    }

    // Try to get withdrawals data with count
    try {
      const { count, error } = await supabaseAdmin
        .from("offramps")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")

      if (!error) {
        withdrawalCount = count || 0
      }
    } catch (error) {
      console.error("Error fetching withdrawal count:", error)
    }

    // Try to get bridges data with count
    try {
      const { count, error } = await supabaseAdmin
        .from("bridges")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")

      if (!error) {
        bridgeCount = count || 0
      }
    } catch (error) {
      console.error("Error fetching bridge count:", error)
    }

    // Try to get sums separately for efficiency
    try {
      const { data, error } = await supabaseAdmin.from("onramps").select("amount").eq("status", "completed")

      if (!error && data) {
        onrampVolume = data.reduce((sum, d) => sum + (d.amount || 0), 0)
      }
    } catch (error) {
      console.error("Error fetching deposit sum:", error)
    }

    try {
      const { data, error } = await supabaseAdmin.from("offramps").select("amount").eq("status", "completed")

      if (!error && data) {
        offrampVolume = data.reduce((sum, w) => sum + (w.amount || 0), 0)
      }
    } catch (error) {
      console.error("Error fetching withdrawal sum:", error)
    }

    try {
      const { data, error } = await supabaseAdmin.from("bridges").select("amount").eq("status", "completed")

      if (!error && data) {
        bridgeVolume = data.reduce((sum, b) => sum + (b.amount || 0), 0)
      }
    } catch (error) {
      console.error("Error fetching bridge sum:", error)
    }

    const totalTransactions = depositCount + withdrawalCount + bridgeCount

    return NextResponse.json({
      onrampVolume: onrampVolume.toString(),
      offrampVolume: offrampVolume.toString(),
      bridgeVolume: bridgeVolume.toString(),
      totalTransactions,
    })
  } catch (error) {
    console.error("Error getting transaction stats:", error)
    // Return default values instead of an error response
    return NextResponse.json({
      onrampVolume: "0",
      offrampVolume: "0",
      bridgeVolume: "0",
      totalTransactions: 0,
    })
  }
}

