// Types for API responses
export interface VirtualAccountResponse {
  status: boolean
  message: string
  data: {
    accountNumber: string
    bankName: string
    accountName: string
    reference: string
    expiresAt: string
  }
}

export interface BankVerificationResponse {
  status: boolean
  message: string
  data: {
    accountNumber: string
    accountName: string
    bankName: string
    isValid: boolean
  }
}

export interface OfframpResponse {
  status: boolean
  message: string
  data: {
    reference: string
    estimatedTime: string
    amount: string
  }
}

export interface BridgeStatusResponse {
  status: boolean
  message: string
  data: {
    sourceChain: string
    destinationChain: string
    bridgeStatus: "pending" | "processing" | "completed" | "failed"
    estimatedTime: string
    reference: string
  }
}

// Add to your existing types
export interface WithdrawalStatus {
  id: string
  status: "pending" | "processing" | "completed" | "failed"
  amount: number
  bankTransferReference?: string
  createdAt: string
  updatedAt: string
}

// Generate virtual account for onramp
export const generateVirtualAccountAPI = async (amount: string): Promise<VirtualAccountResponse> => {
  try {
    if (!window.ethereum?.selectedAddress) {
      throw new Error("No wallet address found")
    }

    const response = await fetch("/api/onramp/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userAddress: window.ethereum.selectedAddress,
        amount,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        throw new Error(errorJson.error || "Failed to generate virtual account")
      } catch (e) {
        throw new Error("Server error: Failed to generate virtual account")
      }
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "Failed to generate virtual account")
    }

    return {
      status: true,
      message: "Virtual account generated successfully",
      data: {
        accountNumber: data.virtualAccount,
        bankName: data.bankName,
        accountName: data.accountName,
        reference: data.onrampId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      },
    }
  } catch (error: any) {
    console.error("Error generating virtual account:", error)
    throw new Error(error.message || "Failed to generate virtual account")
  }
}

// Confirm deposit for onramp
export const confirmDepositAPI = async (
  reference: string,
  amount: string,
): Promise<{
  status: boolean
  message: string
}> => {
  try {
    if (!window.ethereum?.selectedAddress) {
      throw new Error("No wallet address found")
    }

    const response = await fetch("/api/deposit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bankReference: reference,
        userAddress: window.ethereum.selectedAddress,
        amount,
        onrampId: reference,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        throw new Error(errorJson.error || "Failed to confirm deposit")
      } catch (e) {
        throw new Error("Server error: Failed to confirm deposit")
      }
    }

    const data = await response.json()
    return {
      status: true,
      message: "Payment confirmed successfully",
    }
  } catch (error: any) {
    console.error("Error confirming deposit:", error)
    throw new Error(error.message || "Failed to confirm deposit")
  }
}

// Verify bank account for offramp
export const verifyBankAccountAPI = async (
  accountNumber: string,
  bankName: string,
): Promise<BankVerificationResponse> => {
  try {
    const response = await fetch("/api/verify/bank-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountNumber, bankName }),
    })

    if (!response.ok) {
      throw new Error("Failed to verify bank account")
    }

    const data = await response.json()
    return {
      status: true,
      message: "Account verified successfully",
      data: {
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankName: data.bankName,
        isValid: true,
      },
    }
  } catch (error: any) {
    console.error("Error verifying bank account:", error)
    throw new Error(error.message || "Failed to verify bank account")
  }
}

// Initiate offramp process
export const initiateOfframpAPI = async (
  amount: string,
  bankDetails: {
    accountNumber: string
    accountName: string
    bankName: string
  },
): Promise<OfframpResponse> => {
  try {
    const response = await fetch("/api/register/offramp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        bankAccount: bankDetails.accountNumber,
        accountName: bankDetails.accountName,
        bankName: bankDetails.bankName,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to initiate offramp")
    }

    const data = await response.json()
    return {
      status: true,
      message: "Offramp initiated successfully",
      data: {
        reference: data.offRampId,
        estimatedTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
        amount,
      },
    }
  } catch (error: any) {
    console.error("Error initiating offramp:", error)
    throw new Error(error.message || "Failed to initiate offramp")
  }
}

// Initiate bridge process
export const initiateBridgeAPI = async (
  amount: string,
  sourceChain: string,
  destinationChain: string,
): Promise<BridgeStatusResponse> => {
  try {
    const response = await fetch("/api/bridge/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        sourceChain,
        destinationChain,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to initiate bridge")
    }

    const data = await response.json()
    return {
      status: true,
      message: "Bridge initiated successfully",
      data: {
        sourceChain,
        destinationChain,
        bridgeStatus: "pending",
        estimatedTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
        reference: data.bridgeId,
      },
    }
  } catch (error: any) {
    console.error("Error initiating bridge:", error)
    throw new Error(error.message || "Failed to initiate bridge")
  }
}

// Check bridge status
export const checkBridgeStatusAPI = async (reference: string): Promise<BridgeStatusResponse> => {
  try {
    const response = await fetch(`/api/bridge/status/${reference}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to check bridge status")
    }

    const data = await response.json()
    return {
      status: true,
      message: `Bridge ${data.status}`,
      data: {
        sourceChain: data.sourceChain,
        destinationChain: data.destinationChain,
        bridgeStatus: data.status,
        estimatedTime: data.estimatedTime,
        reference: reference,
      },
    }
  } catch (error: any) {
    console.error("Error checking bridge status:", error)
    throw new Error(error.message || "Failed to check bridge status")
  }
}

// Get supported chains
export const getSupportedChainsAPI = async (): Promise<
  Array<{
    id: number
    name: string
    status: "active" | "congested" | "inactive"
  }>
> => {
  try {
    const response = await fetch("/api/chains", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to get supported chains")
    }

    return await response.json()
  } catch (error: any) {
    console.error("Error getting supported chains:", error)
    throw new Error(error.message || "Failed to get supported chains")
  }
}

// Get supported banks
export const getSupportedBanksAPI = async (): Promise<
  Array<{
    code: string
    name: string
  }>
> => {
  try {
    const response = await fetch("/api/banks", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to get supported banks")
    }

    return await response.json()
  } catch (error: any) {
    console.error("Error getting supported banks:", error)
    throw new Error(error.message || "Failed to get supported banks")
  }
}

// Get transaction stats
export const getTransactionStats = async (): Promise<{
  onrampVolume: string
  offrampVolume: string
  bridgeVolume: string
  totalTransactions: number
}> => {
  try {
    const response = await fetch("/api/stats", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to get transaction stats")
    }

    return await response.json()
  } catch (error: any) {
    console.error("Error getting transaction stats:", error)
    throw new Error(error.message || "Failed to get transaction stats")
  }
}

// Add this new function to check withdrawal status
export const checkWithdrawalStatus = async (withdrawalId: string): Promise<WithdrawalStatus> => {
  try {
    const response = await fetch(`/api/withdrawal/status/${withdrawalId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to check withdrawal status")
    }

    return await response.json()
  } catch (error: any) {
    console.error("Error checking withdrawal status:", error)
    throw new Error(error.message || "Failed to check withdrawal status")
  }
}

