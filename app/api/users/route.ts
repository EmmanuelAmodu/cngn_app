import { NextResponse } from "next/server"
import { prisma } from "@/lib/database"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, mobileNumber, address } = body

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { address: address.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        address: address.toLowerCase(),
        firstName,
        lastName,
        email,
        mobileNumber,
      },
    })

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { address: address.toLowerCase() },
    })

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
} 