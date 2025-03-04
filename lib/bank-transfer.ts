interface BankTransferResult {
  success: boolean
  reference: string
  message: string
}

interface BankDetails {
  accountNumber: string
  accountName: string
  bankName: string
  bankCode: string
}

export async function sendNGNToBank(amount: number, bankDetails: BankDetails): Promise<BankTransferResult> {
  try {
    // Instead of directly using crypto here, we'll call our API endpoint
    // that will handle the Numero API interaction server-side
    const response = await fetch("/api/payout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        destinationAccountNumber: bankDetails.accountNumber,
        destinationBankCode: bankDetails.bankCode,
        destinationAccountName: bankDetails.accountName,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Fund transfer failed")
    }

    const responseData = await response.json()

    return {
      success: true,
      reference: responseData.transferReference,
      message: "Transfer successful",
    }
  } catch (error) {
    console.error("Error in bank transfer:", error)

    // For development/testing, we'll still allow a fallback to simulate success
    if (process.env.NODE_ENV === "development") {
      console.warn("Using fallback success response for development")
      return {
        success: true,
        reference: `NGN${Date.now()}${Math.floor(Math.random() * 1000)}`,
        message: "Transfer simulated (development mode)",
      }
    }

    throw error
  }
}

