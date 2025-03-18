import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import type { TransactionType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("userAddress");
    const chainId = searchParams.get("chainId");
    const type = searchParams.get("type") as TransactionType | null;

    if (!userAddress) {
      return NextResponse.json(
        { error: "User address is required" },
        { status: 400 }
      );
    }

    const where = {
      userAddress,
      ...(chainId && { chainId: Number.parseInt(chainId, 10) }),
      ...(type && { type }),
    };

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
