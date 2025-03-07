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
      return NextResponse.json({
        success: true,
        accountNumber: data[0].account_number,
        bankName: data[0].bank_name,
        accountName: data[0].account_name,
        reference: data[0].reference,
      });
    }

    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching deposit volume:", error);
  }
}
