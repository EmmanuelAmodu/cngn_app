import { NextResponse } from "next/server"

export async function GET() {
  // In a real implementation, this would come from your database or banking provider
  const banks = [
    { code: "044", name: "Access Bank" },
    { code: "057", name: "Zenith Bank" },
    { code: "011", name: "First Bank" },
    { code: "033", name: "UBA" },
    { code: "058", name: "GTBank" },
    { code: "232", name: "Sterling Bank" },
    { code: "035", name: "Wema Bank" },
    { code: "050", name: "Ecobank" },
    { code: "301", name: "Providus Bank" },
    { code: "101", name: "Providus Bank" },
  ]

  return NextResponse.json(banks)
}

