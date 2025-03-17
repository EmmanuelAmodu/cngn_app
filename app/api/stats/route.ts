import { prisma } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET() {
  const transactions = await prisma.transaction.groupBy({
    by: ['type', 'status'],
    where: { status: "completed" },
    _count: true,
    _sum: {
      amount: true
    }
  });

  const stats = {
    onrampVolume: 0,
    offrampVolume: 0,
    bridgeVolume: 0,
    totalTransactions: 0
  };

  for (const tx of transactions) {
    if (tx.type === 'onramp') {
      stats.onrampVolume = Number(tx._sum.amount) || 0;
    } else if (tx.type === 'offramp') {
      stats.offrampVolume = Number(tx._sum.amount) || 0;
    } else if (tx.type === 'bridge') {
      stats.bridgeVolume = Number(tx._sum.amount) || 0;
    }
    stats.totalTransactions += tx._count;
  }

  return NextResponse.json(stats);
}

