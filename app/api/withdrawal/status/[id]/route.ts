import { prisma } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { offrampId: string } }) {
  try {
    const offRamp = await prisma.offramp.findUnique({
      where: {
        offrampId: params.offrampId
      }
    })

    if (!offRamp) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 })
    }

    return NextResponse.json(offRamp)
  } catch (error) {
    console.error("Error getting withdrawal status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

