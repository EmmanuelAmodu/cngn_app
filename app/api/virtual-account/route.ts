import { NextResponse } from "next/server"
import { prisma } from "@/lib/database"
import type { Currency } from "@prisma/client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get("userAddress")
    const currency = (searchParams.get("currency") || "NGN") as Currency

    if (!userAddress) {
      return NextResponse.json(
        { error: "User address is required" },
        { status: 400 }
      )
    }

    const normalizedAddress = userAddress.toLowerCase()

    // Find virtual account for this currency
    const virtualAccount = await prisma.virtualAccount.findFirst({
      where: {
        userAddress: normalizedAddress,
        currency,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            mobileNumber: true,
          }
        }
      }
    })

    if (!virtualAccount) {
      return NextResponse.json(
        { error: "Virtual account not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: virtualAccount,
    })
  } catch (error) {
    console.error("Error fetching virtual account:", error)
    return NextResponse.json(
      { error: "Failed to fetch virtual account" },
      { status: 500 }
    )
  }
} 