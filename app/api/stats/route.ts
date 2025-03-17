import { prisma } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET() {
  try {

    const depositCount = await prisma.onramp.count({
      where: { status: "completed" },
    })

    const withdrawalCount = await prisma.offramp.count({
      where: { status: "completed" },
    })

    const bridgeCount = await prisma.bridge.count({
      where: { status: "completed" },
    })

    const onrampAggregate = await prisma.onramp.aggregate({
      _sum: {
        amount: true,
      },
      where: { status: "completed" },
    })
    const onrampVolume = onrampAggregate._sum.amount || 0

    const offrampAggregate = await prisma.offramp.aggregate({
      _sum: {
        amount: true,
      },
      where: { status: "completed" },
    })
    const offrampVolume =  offrampAggregate._sum.amount || 0

    const bridgeAggregate = await prisma.bridge.aggregate({
      _sum: {
        amount: true,
      },
      where: { status: "completed" },
    })
    const bridgeVolume =  bridgeAggregate._sum.amount || 0

    const totalTransactions = depositCount + withdrawalCount + bridgeCount

    return NextResponse.json({
      onrampVolume,
      offrampVolume,
      bridgeVolume,
      totalTransactions,
    })
  } catch (error) {
    console.error("Error getting transaction stats:", error)
    // Return default values instead of an error response
    return NextResponse.json({
      onrampVolume: 0,
      offrampVolume: 0,
      bridgeVolume: 0,
      totalTransactions: 0,
    })
  }
}

