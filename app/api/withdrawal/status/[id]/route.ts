import { prisma } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { offrampId: string } }) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: params.offrampId,
        type: 'offramp'
      }
    })

    if (!transaction) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error getting withdrawal status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

