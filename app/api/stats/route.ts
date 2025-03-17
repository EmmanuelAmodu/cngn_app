import { prisma } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET() {
  const depositCount = await prisma.onramp.count({
    where: { status: "completed" },
  })

  console.log("Deposit count:", depositCount)

  const withdrawalCount = await prisma.offramp.count({
    where: { status: "completed" },
  })

  console.log("Withdrawal count:", withdrawalCount)

  const bridgeCount = await prisma.bridge.count({
    where: { status: "completed" },
  })

  console.log("Bridge count:", bridgeCount)

  const onrampAggregate = await prisma.onramp.aggregate({
    _sum: {
      amount: true,
    },
    where: { status: "completed" },
  })
  const onrampVolume = onrampAggregate._sum.amount || 0

  console.log("Onramp volume:", onrampVolume)

  const offrampAggregate = await prisma.offramp.aggregate({
    _sum: {
      amount: true,
    },
    where: { status: "completed" },
  })
  const offrampVolume =  offrampAggregate._sum.amount || 0

  console.log("Offramp volume:", offrampVolume)

  const bridgeAggregate = await prisma.bridge.aggregate({
    _sum: {
      amount: true,
    },
    where: { status: "completed" },
  })
  const bridgeVolume =  bridgeAggregate._sum.amount || 0

  console.log("Bridge volume:", bridgeVolume)

  const totalTransactions = depositCount + withdrawalCount + bridgeCount

  return NextResponse.json({
    onrampVolume,
    offrampVolume,
    bridgeVolume,
    totalTransactions,
  })
}

