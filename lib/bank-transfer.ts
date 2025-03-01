interface BankTransferResult {
  success: boolean
  reference: string
  message: string
}

export async function sendNGNToBank(
  amount: number,
  bankDetails: {
    accountNumber: string
    accountName: string
    bankName: string
  },
): Promise<BankTransferResult> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Simulate 95% success rate
  const isSuccessful = Math.random() < 0.95

  if (isSuccessful) {
    // Generate a mock reference number
    const reference = `NGN${Date.now()}${Math.floor(Math.random() * 1000)}`
    return {
      success: true,
      reference,
      message: "Transfer successful",
    }
  }

  throw new Error("Bank transfer failed")
}

