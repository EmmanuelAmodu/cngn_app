import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/database"

export async function POST(request: Request) {
  try {
    const { amount, destinationChain, userAddress, sourceChainId, sourceTxHash } = await request.json()

    if (!amount || !sourceChainId || !destinationChain || !userAddress) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Generate a unique transaction ID as bytes32
    const transactionId = `0x${randomBytes(32).toString("hex")}`

    await prisma.transaction.create({
      data: {
        id: transactionId,
        type: 'bridge',
        userAddress,
        amount: Number.parseInt(amount),
        sourceChainId,
        destinationChainId: destinationChain,
        currency: 'NGN'
      }
    })

    return NextResponse.json({
      success: true,
      transactionId,
    })
  } catch (error) {
    console.error("Error in bridge initiation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
