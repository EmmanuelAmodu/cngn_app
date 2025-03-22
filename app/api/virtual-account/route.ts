import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { generateVirtualAccountAPI } from "@/lib/api";
import { createCustomer, createVirtualAccount } from "@/lib/checkbook-client";
import type { Currency } from "@prisma/client";

interface VirtualAccountData {
  accountNumber: string;
  accountName: string;
  bankName: string;
  routingNumber: string | null;
  reference: string | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("userAddress");
    const currency = searchParams.get("currency") as Currency;

    if (!userAddress) {
      return NextResponse.json(
        { error: "User address is required" },
        { status: 400 }
      );
    }

    if (!currency) {
      return NextResponse.json(
        { error: "Currency is required" },
        { status: 400 }
      );
    }

    const normalizedAddress = userAddress.toLowerCase();

    // Check if virtual account already exists
    const existingAccount = await prisma.virtualAccount.findFirst({
      where: {
        userAddress: normalizedAddress,
        currency,
      },
    });

    if (existingAccount) {
      return NextResponse.json(existingAccount);
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { address: normalizedAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.email || !user.mobileNumber) {
      return NextResponse.json(
        { error: "User profile is incomplete" },
        { status: 400 }
      );
    }

    let virtualAccountData: VirtualAccountData;

    if (currency === "NGN") {
      // Use Paystack for NGN
      const response = await generateVirtualAccountAPI({
        userAddress: normalizedAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        currency: "NGN",
      });

      if (!response.status || !response.data) {
        throw new Error(response.message || "Failed to generate virtual account");
      }

      virtualAccountData = {
        accountNumber: response.data.accountNumber,
        accountName: response.data.accountName,
        bankName: response.data.bankName,
        routingNumber: response.data.routingNumber || null,
        reference: response.data.reference || null,
      };
    } else if (currency === "USD") {
      // Use Checkbook for USD
      const customer = await createCustomer({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.mobileNumber,
      });

      const account = await createVirtualAccount(customer.id);

      virtualAccountData = {
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        bankName: account.bankName,
        routingNumber: account.routingNumber,
        reference: account.id,
      };
    } else {
      return NextResponse.json(
        { error: "Unsupported currency" },
        { status: 400 }
      );
    }

    // Create virtual account in database
    const virtualAccount = await prisma.virtualAccount.create({
      data: {
        ...virtualAccountData,
        userAddress: normalizedAddress,
        currency,
      },
    });

    return NextResponse.json(virtualAccount);
  } catch (error) {
    console.error("Error in virtual account creation:", error);
    return NextResponse.json(
      { error: "Failed to create virtual account" },
      { status: 500 }
    );
  }
} 