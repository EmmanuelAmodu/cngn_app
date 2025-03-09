import { bankList } from "@/lib/flutterwave-client"
import { NextResponse } from "next/server"

export async function GET() {
  const banks = await bankList()

  return NextResponse.json(banks)
}

