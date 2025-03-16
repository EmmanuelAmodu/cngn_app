import { NextResponse } from "next/server"
import { prisma } from "@/lib/database"

export async function GET(request: Request, { params }: { params: { bridgeId: string } }) {
  try {
    const bridge = await prisma.bridge.findUnique({
      where: {
        bridgeId: params.bridgeId,
      },
    });
  
    if (!bridge) {
      return NextResponse.json({ error: "Bridge not found" }, { status: 404 })
    }

    return NextResponse.json(bridge)
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

