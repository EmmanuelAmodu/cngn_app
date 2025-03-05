import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("virtual_accounts")
      .select("*")
      .eq("address", params.address)
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching deposit volume:", error);
  }
}
