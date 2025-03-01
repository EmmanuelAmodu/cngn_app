import { NextResponse } from "next/server"

export async function GET() {
  // In a real implementation, this would come from your database or configuration
  const chains = [
    { id: 1, name: "Ethereum", status: "active" },
    { id: 137, name: "Polygon", status: "active" },
    { id: 42161, name: "Arbitrum", status: "active" },
    { id: 10, name: "Optimism", status: "congested" },
    { id: 56, name: "BNB Chain", status: "active" },
    { id: 43114, name: "Avalanche", status: "active" },
    { id: 250, name: "Fantom", status: "inactive" },
    { id: 42220, name: "Celo", status: "active" },
  ] as const

  return NextResponse.json(chains)
}

