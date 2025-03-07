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
      .eq("user_address", params.address)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: "API Error" }, { status: 500 });
    }

    if (data.length > 0) {
      return NextResponse.json(data[0]);
    }

    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching deposit volume:", error);
  }
}
