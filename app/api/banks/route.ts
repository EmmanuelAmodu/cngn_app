import { getBankList } from "@/lib/paystack-client"
import { NextResponse } from "next/server"

export async function GET() {
  const banks = await getBankList()

  return NextResponse.json(banks)
}

