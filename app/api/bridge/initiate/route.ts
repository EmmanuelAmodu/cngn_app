import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const { amount, sourceChain, destinationChain, userAddress } =
      await request.json();

    if (!amount || !sourceChain || !destinationChain || !userAddress) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const bridgeId = `0x${randomBytes(32).toString("hex")}`;

    const { error } = await supabase.from("bridges").insert({
      id: bridgeId,
      user_address: userAddress, // This should come from the authenticated user
      amount: Number.parseInt(amount),
      destination_chain_id: destinationChain, // This should be properly mapped from destinationChain
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      bridgeId,
    });
  } catch (error) {
    console.error("Error in bridge initiation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
