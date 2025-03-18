import type { Currency } from "@prisma/client"

interface APIResponse<T> {
  status: boolean
  message?: string
  data?: T
}

interface VirtualAccountRequest {
  userAddress: string
  firstName: string
  lastName: string
  email: string
  mobileNumber: string
  currency: Currency
}

interface VirtualAccountResponse {
  accountNumber: string
  accountName: string
  bankName: string
  routingNumber?: string
  reference?: string
}

export async function generateVirtualAccountAPI(
  data: VirtualAccountRequest
): Promise<APIResponse<VirtualAccountResponse>> {
  try {
    const response = await fetch("/api/generate-virtual-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    return await response.json()
  } catch (error) {
    console.error("Error generating virtual account:", error)
    return {
      status: false,
      message: "Failed to generate virtual account",
    }
  }
}

// Types for API responses
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

// Add to your existing types
export interface FundTransferResponse {
  status: boolean
  message: string
  data: {
    transferReference: string[]
  }
}

export const fetchVirtualAccountAPI = async (userAddress: string) => {
  try {
    const response = await fetch(`/api/virtual-account/${userAddress}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
  
    // console.log(response.test())
    if (response.ok) {
      const account = await response.json()
      return account.data
    }
  } catch (error) {
    console.error("Error fetching virtual account:", error)
    throw new Error((error as { message: string }).message || "Failed to fetch virtual account")
  }
}

// Confirm deposit for onramp
export const fetchDepositAPI = async (
  chainId: number,
  userAddress: string,
): Promise<{
  status: boolean
  message: string
  data: []
}> => {
  const params = new URLSearchParams({
    chainId: chainId.toString(),
    userAddress,
  });

  try {
    if (!userAddress) {
      throw new Error("No wallet address found")
    }

    if (!chainId) {
      throw new Error("No chain ID found")
    }

    const response = await fetch(`/api/deposit?${params}`, {
      headers: {
        "Content-Type": "application/json",
      },
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

    return response.json()
  } catch (error) {
    console.error("Error confirming deposit:", error)
    throw new Error((error as { message: string }).message || "Failed to confirm deposit")
  }
}

// Update the verifyBankAccountAPI function
export const verifyBankAccountAPI = async (
  accountNumber: string,
  bankCode: string,
  amount?: number,
): Promise<BankVerificationResponse> => {
  try {
    const response = await fetch("/api/verify/bank-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountNumber,
        bankCode,
        amount: amount || 1000.0, // Use provided amount or default to 1000
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to verify bank account")
    }

    const data = await response.json()

    if (!data.status) {
      throw new Error(data.message || "Failed to verify bank account")
    }

    return {
      status: true,
      message: "Account verified successfully",
      data: {
        accountNumber: data.data.accountNumber,
        accountName: data.data.accountName,
        bankName: data.data.bankName, // Use the bank name from the API response
        isValid: true,
      },
    }
  } catch (error) {
    console.error("Error verifying bank account:", error)
    throw error
  }
}

// Update the initiateOfframpAPI function to include chainId
export const initiateOfframpAPI = async (
  amount: string,
  bankDetails: {
    accountNumber: string
    accountName: string
    bankName: string
    bankCode: string
  },
  chainId = 1,
): Promise<OfframpResponse> => {
  try {
    const response = await fetch("/api/register/offramp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        bankAccount: JSON.stringify(bankDetails),
        userAddress: window.ethereum?.selectedAddress,
        chainId,
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
  } catch (error) {
    console.error("Error initiating offramp:", error)
    throw new Error((error as { message: string }).message || "Failed to initiate offramp")
  }
}

// Initiate bridge process
export const initiateBridgeAPI = async (
  amount: string,
  sourceChain: string,
  destinationChain: string,
  sourceChainId = 1,
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
        sourceChainId,
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
  } catch (error) {
    console.error("Error initiating bridge:", error)
    throw new Error((error as { message: string }).message || "Failed to initiate bridge")
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
  } catch (error) {
    console.error("Error checking bridge status:", error)
    throw new Error((error as { message: string }).message || "Failed to check bridge status")
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
  } catch (error) {
    console.error("Error getting supported chains:", error)
    throw new Error((error as { message: string }).message || "Failed to get supported chains")
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
  } catch (error) {
    console.error("Error getting supported banks:", error)
    throw new Error((error as { message: string }).message || "Failed to get supported banks")
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
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch("/api/stats", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Failed to get transaction stats: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error getting transaction stats:", error)
    // Return default values instead of throwing
    return {
      onrampVolume: "0",
      offrampVolume: "0",
      bridgeVolume: "0",
      totalTransactions: 0,
    }
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
  } catch (error) {
    console.error("Error checking withdrawal status:", error)
    throw new Error((error as { message: string }).message || "Failed to check withdrawal status")
  }
}

