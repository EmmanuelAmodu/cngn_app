import { createHmac } from "node:crypto"
import type { NumeroVirtualAccountRequest, NumeroVirtualAccountResponse } from "./types/numero"

const NUMERO_API_URL = process.env.NUMERO_API_URL || "https://api.getnumero.co"
const NUMERO_API_KEY = process.env.NUMERO_API_KEY as string
const NUMERO_API_SECRET = process.env.NUMERO_API_SECRET as string
const BVN = process.env.NUMERO_BVN as string

if (!NUMERO_API_KEY || !NUMERO_API_SECRET) {
  throw new Error("Numero API credentials not configured")
}

function generateSignature(payload: string): string {
  return createHmac("sha256", NUMERO_API_SECRET).update(payload).digest("hex")
}

export async function createVirtualAccount(data: NumeroVirtualAccountRequest): Promise<NumeroVirtualAccountResponse> {
  data.bvn = BVN
  const requestData = JSON.stringify(data);
  const signature = generateSignature(requestData);

  try {
    const numeroResponse = await fetch(
      `${NUMERO_API_URL}/virtualaccount/customer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": NUMERO_API_KEY,
          "X-Signature-Key": signature,
        },
        body: requestData,
      }
    );

    if (!numeroResponse.ok) {
      const errorText = await numeroResponse.text();
      console.error("Virtual account creation failed:", numeroResponse.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || "Failed to create virtual account");
      } catch (e) {
        throw new Error(`Failed to create virtual account: ${errorText}`);
      }
    }

    const responseData = await numeroResponse.json();
    console.log("Virtual account creation response:", responseData);

    if (!responseData.status) {
      throw new Error(
        responseData.message || "Failed to create virtual account"
      );
    }

    return responseData;
  } catch (error) {
    console.error("Error creating virtual account:", error);
    throw new Error(`Error creating virtual account: ${error instanceof Error ? error.message : error}`);
  }
}

export async function getVirtualAccount(reference: string): Promise<NumeroVirtualAccountResponse> {
  try {
    const numeroResponse = await fetch(
      `${NUMERO_API_URL}/api/v1/business/virtualaccount/reference?reference=${reference}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": NUMERO_API_KEY,
        },
      }
    );

    if (!numeroResponse.ok) {
      const errorText = await numeroResponse.text();
      console.error("Virtual account fetching failed:", numeroResponse.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || "Failed to fetch virtual account");
      } catch (e) {
        throw new Error(`Failed to fetch virtual account: ${errorText}`);
      }
    }

    const responseData = await numeroResponse.json();
    console.log("Virtual account fetching response:", responseData);

    if (!responseData.status) {
      throw new Error(
        responseData.message || "Failed to fetch virtual account"
      );
    }

    return responseData;
  } catch (error) {
    console.error("Error fetching virtual account:", error);
    throw new Error(`Error fetching virtual account: ${error instanceof Error ? error.message : error}`);
  }
}

export async function getTransaction(reference: string) {
  try {
    const numeroResponse = await fetch(
      `${NUMERO_API_URL}/api/v1/business/transaction/reference?reference=${reference}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": NUMERO_API_KEY,
        },
      }
    );

    if (!numeroResponse.ok) {
      const errorText = await numeroResponse.text();
      console.error("Transaction fetching failed:", numeroResponse.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || "Failed to fetch Transaction");
      } catch (e) {
        throw new Error(`Failed to fetch Transaction: ${errorText}`);
      }
    }

    const responseData = await numeroResponse.json();
    console.log("Transaction fetching response:", responseData);

    if (!responseData.status) {
      throw new Error(
        responseData.message || "Failed to fetch Transaction"
      );
    }

    return responseData;
  } catch (error) {
    console.error("Error fetching transaction:", error);
    throw new Error(`Error fetching transaction: ${error instanceof Error ? error.message : error}`);
  }
}

export async function verifyBankAccount(accountNumber: string, bankCode: string) {
    try {
      const payload = JSON.stringify({
        accountNumber,
        bankCode,
      })
  
      // Generate signature
      const signature = generateSignature(payload)
  
      // Call Numero API to validate account
      const response = await fetch(`${NUMERO_API_URL}/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": NUMERO_API_KEY,
          "X-Signature": signature,
        },
        body: payload,
      })
  
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to validate account")
      }
  
      const data = await response.json()
  
      if (!data.status) {
        throw new Error(data.message || "Account validation failed")
      }
  
      return {
        accountNumber: data.data.accountNumber,
        accountName: data.data.accountName,
        bankCode: data.data.bankCode,
        fees: data.data.fees,
        isValid: true,
      }
    } catch (error) {
      console.error("Error in bank account validation:", error)
      throw new Error(`Error in bank account validation: ${error instanceof Error ? error.message : error}`);
    }
}

export async function verifyTransaction(reference: string): Promise<boolean> {
  try {
    // Get current date and 24 hours ago
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Prepare the request
    const url = `${NUMERO_API_URL}/transaction?startDate=${startDate}&endDate=${endDate}&searchBy=${reference}`
    const signature = generateSignature(url)

    const response = await fetch(url, {
      headers: {
        "X-Api-Key": NUMERO_API_KEY,
        "X-Signature": signature,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to verify transaction")
    }

    const data = await response.json()

    // Check if the transaction exists and is successful
    const transaction = data.data.transactions.find(
      (tx: {
        reference: string
        status: string
        requestState: string
      }) => tx.reference === reference && tx.status === "Successful" && tx.requestState === "Completed",
    )

    return !!transaction
  } catch (error) {
    console.error("Error verifying transaction:", error)
    return false
  }
}
