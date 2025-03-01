import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request, { params }: { params: { reference: string } }) {
  try {
    const { data: bridge, error } = await supabase.from("bridges").select("*").eq("id", params.reference).single()

    if (error) throw error
    if (!bridge) {
      return NextResponse.json({ error: "Bridge not found" }, { status: 404 })
    }

    return NextResponse.json({
      sourceChain: "Ethereum",
      destinationChain: getChainName(bridge.destination_chain_id),
      status: bridge.status,
      estimatedTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      txHash: bridge.destination_tx_hash,
    })
  } catch (error) {
    console.error("Error in bridge status check:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: "Ethereum",
    137: "Polygon",
    42161: "Arbitrum",
    10: "Optimism",
    8453: "Base",
  }
  return chains[chainId] || "Unknown"
}

