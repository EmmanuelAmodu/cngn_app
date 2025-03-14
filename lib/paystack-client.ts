import type {
  PaystackCreateCustomerRequest,
  PaystackCreateCustomerResponse,
  PaystackCreateCustomerVirtualAccountResponse,
  PaystackResolveAccountResponse,
  PaystackTransactionResponse,
} from "./types/paystack";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK API credentials not configured");
}

export async function createCustomer(data: PaystackCreateCustomerRequest) {
  try {
    const url = "https://api.paystack.co/customer";
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
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
      console.error("customer creation failed:", response.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || "Failed to create customer");
      } catch (e) {
        throw new Error(`Failed to create customer: ${errorText}`);
      }
    }

    const responseData: PaystackCreateCustomerResponse = await response.json();
    console.log("customer creation response:", responseData);

    if (!responseData.status) {
      throw new Error(responseData.message || "Failed to create customer");
    }

    return responseData.data;
  } catch (error) {
    console.error("Error creating customer:", error);
    throw new Error(
      `Error creating customer: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

export async function createCustomerVirtualAccount(customerId: number) {
  try {
    const url = "https://api.paystack.co/dedicated_account";
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: customerId,
        preferred_bank: "wema-bank",
      }),
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("customer creation failed:", response.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || "Failed to create customer");
      } catch (e) {
        throw new Error(`Failed to create customer: ${errorText}`);
      }
    }

    const responseData: PaystackCreateCustomerVirtualAccountResponse =
      await response.json();
    console.log("customer creation response:", responseData);

    if (!responseData.status) {
      throw new Error(responseData.message || "Failed to create customer");
    }

    return responseData.data;
  } catch (error) {
    console.error("Error creating customer:", error);
    throw new Error(
      `Error creating customer: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

export async function getBankList() {
  try {
    const url = "https://api.paystack.co/bank";
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bank list fetching failed:", response.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || "Failed to fetch Bank list");
      } catch (e) {
        throw new Error(`Failed to fetch Bank list: ${errorText}`);
      }
    }

    const responseData = await response.json();
    console.log("Bank list fetching response:", responseData);

    return responseData.data;
  } catch (error) {
    console.error("Error fetching Bank list:", error);
    throw new Error(
      `Error fetching Bank list: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

export async function getCustomerTransactions(customerId?: number) {
  const params = new URLSearchParams({});
  if (customerId) params.append("customer", customerId.toString());
  params.append("status", "success");

  try {
    const url = `https://api.paystack.co/transaction?customer=${params.toString()}`;
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Customer transactions fetching failed:",
        response.status,
        errorText
      );

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || "Failed to fetch customer transactions");
      } catch (e) {
        throw new Error(`Failed to fetch customer transactions: ${errorText}`);
      }
    }

    const responseData: PaystackTransactionResponse = await response.json();
    return responseData.data;
  } catch (error) {
    console.error("Error fetching customer transactions:", error);
    throw new Error(
      `Error fetching customer transactions: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

export async function verifyBankAccount(accountNumber: string, bankCode: string) {
  try {
    const url = `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`;

    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bank account verification failed:", response.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || "Failed to verify bank account");
      } catch (e) {
        throw new Error(`Failed to verify bank account: ${errorText}`);
      }
    }

    const responseData: PaystackResolveAccountResponse = await response.json();
    console.log("Bank account verification response:", responseData);
  
    return responseData.data;
  } catch (error) {
    console.error("Error verifying bank account:", error);
    throw new Error(
      `Error verifying bank account: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}
