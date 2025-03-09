import type {
  FlutterResponse,
  FlutterTransactionResponse,
  FlutterVirtualAccountRequest,
  FlutterVirtualAccountResponse,
  FlutterVirtualAccountResponseData,
} from "./types/flutterwave";

const FLUTTERWAVE_API_URL =
  process.env.FLUTTERWAVE_API_URL || "https://api.flutterwave.com/v3";
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY as string;
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY as string;
const FLUTTERWAVE_ENCRYPTION_KEY = process.env
  .FLUTTERWAVE_ENCRYPTION_KEY as string;
const BVN = process.env.BVN as string;

if (
  !FLUTTERWAVE_PUBLIC_KEY ||
  !FLUTTERWAVE_SECRET_KEY ||
  !FLUTTERWAVE_ENCRYPTION_KEY ||
  !BVN
) {
  throw new Error("FLUTTERWAVE API credentials not configured");
}

export async function createVirtualAccount(
  data: FlutterVirtualAccountRequest
): Promise<FlutterVirtualAccountResponseData> {
  try {
    const url = `${FLUTTERWAVE_API_URL}/virtual-account-numbers`;
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        tx_ref: data.userAddress,
        is_permanent: true,
        narration: data.name,
        bvn: BVN,
      }),
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Virtual account creation failed:",
        response.status,
        errorText
      );

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || "Failed to create virtual account");
      } catch (e) {
        throw new Error(`Failed to create virtual account: ${errorText}`);
      }
    }

    const responseData: FlutterVirtualAccountResponse = await response.json();
    console.log("Virtual account creation response:", responseData);

    if (responseData.status !== "success") {
      throw new Error(
        responseData.message || "Failed to create virtual account"
      );
    }

    return responseData.data;
  } catch (error) {
    console.error("Error creating virtual account:", error);
    throw new Error(
      `Error creating virtual account: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

export async function getTransactions(from: string, to: string, page: number, status: string): Promise<FlutterTransactionResponse> {
  try {
    const url = `${FLUTTERWAVE_API_URL}/transactions?from=${from}&to=${to}&page=${page}&status=successful&currency=NGN`;
    const options = {
      method: 'GET',
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      }
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transaction fetching failed:", response.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || "Failed to fetch Transaction");
      } catch (e) {
        throw new Error(`Failed to fetch Transaction: ${errorText}`);
      }
    }

    const responseData = await response.json();
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

export async function verifyBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<{
  account_number: string;
  account_name: string;
}> {
  try {
    const url = `${FLUTTERWAVE_API_URL}/accounts/resolve`;
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_number: accountNumber,
        account_bank: bankCode,
      }),
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Bank account validation failed:",
        response.status,
        errorText
      );

      throw new Error(`Failed to validate bank account: ${errorText}`);
    }

    const responseData: FlutterResponse<{
      account_number: string;
      account_name: string;
    }> = await response.json();
    console.log("Bank account validation response:", responseData);

    if (responseData.status !== "success") {
      throw new Error(
        responseData.message || "Failed to validate bank account"
      );
    }

    return responseData.data;
  } catch (error) {
    console.error("Error validating bank account:", error);
    throw new Error(
      `Error validating bank account: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

export async function payout(
  amount: number,
  destinationAccountNumber: string,
  destinationBankCode: string,
  reference: string
): Promise<{ reference: string }> {
  try {
    const url = `${FLUTTERWAVE_API_URL}/transfers`;
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        narration: "cNGN Offramp Payment",
        amount,
        account_number: destinationAccountNumber,
        account_bank: destinationBankCode,
        currency: "NGN",
        reference,
      }),
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fund transfer failed:", response.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || "Fund transfer failed");
      } catch (e) {
        throw new Error(`Fund transfer failed: ${errorText}`);
      }
    }

    const responseData: FlutterResponse<{ reference: string }> =
      await response.json();
    console.log("Fund transfer response:", responseData);

    if (responseData.status !== "success") {
      throw new Error(responseData.message || "Fund transfer failed");
    }

    return responseData.data;
  } catch (error) {
    console.error("Error in fund transfer:", error);
    throw new Error(
      `Error in fund transfer: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

export async function bankList(): Promise<{ name: string; code: string }[]> {
  try {
    const url = `${FLUTTERWAVE_API_URL}/banks/NG`;
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bank list fetching failed:", response.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || "Failed to fetch bank list");
      } catch (e) {
        throw new Error(`Failed to fetch bank list: ${errorText}`);
      }
    }

    const responseData: FlutterResponse<{ name: string; code: string }[]> =
      await response.json();
    console.log("Bank list fetching response:", responseData);

    if (responseData.status !== "success") {
      throw new Error(responseData.message || "Failed to fetch bank list");
    }

    return responseData.data;
  } catch (error) {
    console.error("Error fetching bank list:", error);
    throw new Error(
      `Error fetching bank list: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}
