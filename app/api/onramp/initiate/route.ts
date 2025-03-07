import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { randomBytes, createHmac } from "crypto";
import { createVirtualAccount } from "@/lib/numero-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userAddress, amount, firstName, lastName, email, mobileNumber } =
      body;

    console.log("Received onramp initiation request:", {
      userAddress,
      amount,
      firstName,
      lastName,
      email,
      mobileNumber: mobileNumber ? "REDACTED" : "MISSING",
    });

    if (
      !userAddress ||
      !amount ||
      !firstName ||
      !lastName ||
      !email ||
      !mobileNumber
    ) {
      console.error("Missing required fields for onramp initiation:", {
        userAddress: !userAddress,
        amount: !amount,
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

    console.log("Saving to Supabase:", {
      onramp_id: onrampId,
      user_address: userAddress,
      virtual_account: responseData.accountNumber,
      bank_name: responseData.bankName,
      account_name: responseData.accountName,
    });

    // Save to Supabase
    try {
      const { error } = await supabaseAdmin.from("onramps").insert({
        onramp_id: onrampId,
        user_address: userAddress,
        account_id: responseData.id,
      });

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        {
          error: "Failed to save virtual account details",
          details:
            dbError instanceof Error
              ? dbError.message
              : "Unknown database error",
        },
        { status: 500 }
      );
    }

    console.log("Onramp initiation successful", responseData);
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
    firstName,
    lastName,
    email,
    mobileNumber,
    bvn: "",
  });

  const {  data: creationAccountData, error: creatingError } = await supabaseAdmin
    .from("virtual_accounts")
    .upsert({
      user_address: userAddress,
      account_number: responseData.data.accountNumber,
      bank_name: responseData.data.bankName,
      account_name: responseData.data.accountName,
      reference: responseData.data.reference,
    }).select();

  if (creatingError) {
    console.error(creatingError)
    throw new Error(creatingError.message)
  }

  return creationAccountData[0];
}
