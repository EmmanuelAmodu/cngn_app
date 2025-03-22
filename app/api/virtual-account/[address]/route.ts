import { NextResponse } from "next/server";
import { createCustomer, createCustomerVirtualAccount } from "@/lib/paystack-client";
import { createCustomer as createCheckbookCustomer, createVirtualAccount } from "@/lib/checkbook-client";
import { prisma } from "@/lib/database";
import type { Currency } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  const { searchParams } = new URL(request.url);
  const currency = searchParams.get('currency') || 'NGN';

  const data = await prisma.virtualAccount.findFirst({
    where: {
      userAddress: params.address,
      currency: currency as Currency
    }
  })

  if (data) {
    return NextResponse.json({
      success: true,
      data
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      address: params.address
    }
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const virtualAccount = await getOrCreateAccount(
      user.firstName,
      user.lastName,
      user.email,
      user.mobileNumber,
      params.address,
      currency as Currency
    )

    if (virtualAccount) {
      return NextResponse.json({
        success: true,
        data: virtualAccount
      });
    }

    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching deposit volume:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    // Create virtual account via our API endpoint
    console.log("Calling virtual account creation endpoint");

    const responseData = await getOrCreateAccount(
      firstName,
      lastName,
      email,
      mobileNumber,
      userAddress,
      'NGN' as Currency
    );

    console.log("Saving to Database:", responseData);

    return NextResponse.json({
      success: true,
      data: responseData
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
  userAddress: string,
  currency: Currency
) {
  const accountData = await prisma.virtualAccount.findFirst({
    where: { 
      userAddress,
      currency
    }
  })
  
  console.log('Account details from db:', accountData)
  
  if (accountData) return accountData;
  
  if (currency === 'NGN') {
    const createCustomerResponseData = await createCustomer({
      email,
      phone: mobileNumber,
      firstName,
      lastName
    });
  
    const responseData = await createCustomerVirtualAccount(createCustomerResponseData.id);
  
    const creationAccountData = await prisma.virtualAccount.create({
      data: {
        userAddress,
        accountNumber: responseData.account_number,
        bankName: responseData.bank.name,
        accountName: responseData.account_name,
        reference: createCustomerResponseData.id.toString(),
        currency,
      }
    })
  
    return creationAccountData;
  }
  
  if (currency === 'USD') {
    const customer = await createCheckbookCustomer({
      email,
      firstName,
      lastName,
      phone: mobileNumber,
    });
  
    const account = await createVirtualAccount(customer.id);
  
    const creationAccountData = await prisma.virtualAccount.create({
      data: {
        userAddress,
        accountNumber: account.accountNumber,
        bankName: account.bankName,
        accountName: account.accountName,
        routingNumber: account.routingNumber,
        reference: account.id,
        currency,
      }
    })
  
    return creationAccountData;
  }
  
  throw new Error(`Unsupported currency: ${currency}`);
}
