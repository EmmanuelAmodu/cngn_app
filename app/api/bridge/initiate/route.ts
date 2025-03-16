import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/database"

export async function POST(request: Request) {
  try {
    const { amount, destinationChain, userAddress, sourceChainId, sourceTxHash } = await request.json()

    if (!amount || !sourceChainId || !destinationChain || !userAddress) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Generate a unique bridge ID as bytes32
    const bridgeId = `0x${randomBytes(32).toString("hex")}`

    await prisma.bridge.create({
      data: {
        bridgeId,
        userAddress,
        amount: Number.parseInt(amount),
        sourceChainId,
        destinationChainId: destinationChain,
      }
    })

    return NextResponse.json({
      success: true,
      bridgeId,
    })
  } catch (error) {
    console.error("Error in bridge initiation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
