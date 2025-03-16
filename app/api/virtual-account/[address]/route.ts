import { NextResponse } from "next/server";
import { createCustomer, createCustomerVirtualAccount } from "@/lib/paystack-client";
import { prisma } from "@/lib/database";

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const data = await prisma.virtualAccount.findFirst({
      where: {
        userAddress: params.address
      }
    })

    if (data) {
      return NextResponse.json({
        success: true,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        accountName: data.accountName,
        reference: data.reference,
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

    // Create virtual account via our API endpoint
    console.log("Calling virtual account creation endpoint");

    const responseData = await getOrCreateAccount(
      firstName,
      lastName,
      email,
      mobileNumber,
      userAddress
    );

    console.log("Saving to Database:", responseData);

    return NextResponse.json({
      success: true,
      ...responseData
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
  const accountData = await prisma.virtualAccount.findFirst({
    where: { userAddress }
  })

  console.log('Account details from db:', accountData)

  if (accountData) return accountData;

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
    }
  })

  return creationAccountData;
}
