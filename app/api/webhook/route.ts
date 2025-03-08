import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyWebhookSignature } from "@/lib/numero-client";
import type { WebhookRequest } from "@/lib/types/numero";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const body: WebhookRequest = await request.json();
    const signature = request.headers.get('X-Webhook-Signature');
    if (!signature) {
      console.error('No signature in webhook notification')
      return NextResponse.json(
        {
          error: 'No signature'
        },
        { status: 400 }
      );
    }

    console.log("Transaction verified successfully");
    const isValidRequest = verifyWebhookSignature(
      JSON.stringify(body),
      signature
    )

    if (!isValidRequest) {
      return NextResponse.json(
        {
          error: 'Request not valid',
        },
        { status: 400 }
      );
    }

    const { customer_id: accountReference, transaction_id: paymentReference, amount} = body.data;

    console.log("Received webhook payload:", {
      bankReference: paymentReference,
      accountReference,
      amount,
    });

    const { error: virtualAccountError, data: virtualAccounts } = await supabaseAdmin
    .from("virtual_accounts")
    .select("*")
    .eq("reference", accountReference)

    if (virtualAccountError) {
      console.error("Error fetching virtual account:", virtualAccountError);
      throw virtualAccountError;
    }

    if (virtualAccounts.length === 0) {
      return NextResponse.json(
        {
          error: 'Account not found',
        },
        { status: 404 }
      );
    }

    const { user_address: userAddress } = virtualAccounts[0]

    // Validate all required fields
    if (!paymentReference || !userAddress || !amount) {
      return NextResponse.json(
        {
          error: `Missing required fields: ${[
            !paymentReference && "bankReference",
            !userAddress && "userAddress",
            !amount && "amount",
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
      typeof amount !== "string" ||
      Number.isNaN(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    console.log("Saving deposit to Supabase...");

    const onRampId = `0x${randomBytes(32).toString("hex")}`
    // Save deposit to Supabase with correct field names
    const { error: insertError, data: deposit } = await supabaseAdmin
      .from("onramps")
      .insert({
        onramp_id: onRampId,
        user_address: userAddress,
        amount,
        payment_reference: paymentReference,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error into onramps:", insertError);
      throw insertError;
    }

    console.log("Deposit saved successfully:", deposit);

    return NextResponse.json({ status: true }, { status: 200 });
  } catch (error) {
    console.error("Error in deposit webhook:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
