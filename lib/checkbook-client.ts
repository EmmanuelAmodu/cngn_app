import type { Currency } from "@prisma/client";

const CHECKBOOK_API_KEY = process.env.CHECKBOOK_API_KEY;
const CHECKBOOK_SECRET_KEY = process.env.CHECKBOOK_SECRET_KEY;

if (!CHECKBOOK_API_KEY || !CHECKBOOK_SECRET_KEY) {
  throw new Error("CHECKBOOK API credentials not configured");
}

interface CheckbookCreateCustomerRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface CheckbookCreateCustomerResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string;
}

interface CheckbookCreateVirtualAccountResponse {
  id: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  accountName: string;
  currency: string;
  status: string;
  createdAt: string;
}

export async function createCustomer(data: CheckbookCreateCustomerRequest): Promise<CheckbookCreateCustomerResponse> {
  try {
    const url = "https://api.checkbook.io/v3/customer";
    const options = {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${CHECKBOOK_API_KEY}:${CHECKBOOK_SECRET_KEY}`).toString('base64')}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
      }),
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Customer creation failed:", response.status, errorText);
      throw new Error(errorText || "Failed to create customer");
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("Error creating customer:", error);
    throw new Error(
      `Error creating customer: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

export async function createVirtualAccount(customerId: string): Promise<CheckbookCreateVirtualAccountResponse> {
  try {
    const url = "https://api.checkbook.io/v3/virtual-account";
    const options = {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${CHECKBOOK_API_KEY}:${CHECKBOOK_SECRET_KEY}`).toString('base64')}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_id: customerId,
        currency: "USD",
        type: "checking",
      }),
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Virtual account creation failed:", response.status, errorText);
      throw new Error(errorText || "Failed to create virtual account");
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("Error creating virtual account:", error);
    throw new Error(
      `Error creating virtual account: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

export async function getCustomerTransactions(customerId: string) {
  try {
    const url = `https://api.checkbook.io/v3/transactions?customer_id=${customerId}`;
    const options = {
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${CHECKBOOK_API_KEY}:${CHECKBOOK_SECRET_KEY}`).toString('base64')}`,
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transaction fetching failed:", response.status, errorText);
      throw new Error(errorText || "Failed to fetch transactions");
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw new Error(
      `Error fetching transactions: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
} 