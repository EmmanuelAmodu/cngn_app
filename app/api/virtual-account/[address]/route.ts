import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { randomBytes } from "crypto";
import { createVirtualAccount } from "@/lib/flutterwave-client";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userAddress, firstName, lastName, email, mobileNumber } =
      body;

    console.log("Received onramp initiation request:", {
      userAddress,
      firstName,
      lastName,
      email,
      mobileNumber: mobileNumber ? "REDACTED" : "MISSING",
    });

    if (
      !userAddress ||
      !firstName ||
      !lastName ||
      !email ||
      !mobileNumber
    ) {
      console.error("Missing required fields for onramp initiation:", {
        userAddress: !userAddress,
        firstName: !firstName,
        lastName: !lastName,
        email: !email,
        mobileNumber: !mobileNumber,
      });

      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Generate onrampId
    const onrampId = `0x${randomBytes(32).toString("hex")}`;
    console.log("Generated onrampId:", onrampId);

    // Create virtual account via our API endpoint
    console.log("Calling virtual account creation endpoint");

    const responseData = await getOrCreateAccount(
      firstName,
      lastName,
      email,
      mobileNumber,
      userAddress
    );

    console.log("Saving to Supabase:", responseData);

    return NextResponse.json({
      success: true,
      onrampId,
      accountNumber: responseData.account_number,
      bankName: responseData.bank_name,
      accountName: responseData.account_name,
      reference: responseData.reference,
    });
  } catch (error) {
    console.error("Error in onramp initiate:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function getOrCreateAccount(
  firstName: string,
  lastName: string,
  email: string,
  mobileNumber: string,
  userAddress: string
) {
  const { data: accountData, error } = await supabaseAdmin
    .from("virtual_accounts")
    .select("*")
    .eq("user_address", userAddress)
    .single();

  console.log('Account details from db:', accountData)

  if (accountData) return accountData;

  const responseData = await createVirtualAccount({
    email,
    userAddress,
    name: `${firstName} ${lastName}`,
  });

  const {  data: creationAccountData, error: creatingError } = await supabaseAdmin
    .from("virtual_accounts")
    .upsert({
      user_address: userAddress,
      account_number: responseData.account_number,
      bank_name: responseData.bank_name,
      account_name: `${firstName} ${lastName}`,
      reference: responseData.order_ref,
    }).select();

  if (creatingError) {
    console.error(creatingError)
    throw new Error(creatingError.message)
  }

  return creationAccountData[0];
}

