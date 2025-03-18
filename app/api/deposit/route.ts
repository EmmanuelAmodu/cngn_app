import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";

export async function GET(request: Request) {
  // Validate all required fields
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get("userAddress");
  const chainId = Number(searchParams.get("chainId"));

  if (!chainId || !userAddress) {
    return NextResponse.json(
      {
        error: `Missing required fields: ${[
          !userAddress && "userAddress",
          !chainId && "chainId",
        ]
          .filter(Boolean)
          .join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Validate address format
  if (typeof userAddress !== "string" || !userAddress.startsWith("0x")) {
    return NextResponse.json(
      { error: "Invalid wallet address format" },
      { status: 400 }
    );
  }

  // Validate amount
  if (
    Number.isNaN(chainId) ||
    chainId <= 0
  ) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const accountData = await prisma.virtualAccount.findFirst({
    where: { userAddress: userAddress },
  });

  if (!accountData) {
    return NextResponse.json(
      { error: "User account not found" },
      { status: 404 }
    );
  }

  const onramps = await prisma.onramp.findMany({
    where: { userAddress, chainId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: onramps,
  });
}
