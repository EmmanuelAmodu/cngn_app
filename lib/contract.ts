import { CNGN_CONTRACT_ADDRESS, DEX_CONTRACT_ADDRESS, TOKEN_DECIMALS } from "./constants"

// DEX ABI (simplified for deposit, withdraw, and bridge functions)
const DEX_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "chainId", type: "uint256" },
    ],
    name: "bridge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "generateVirtualAccount",
    outputs: [
      { name: "accountNumber", type: "string" },
      { name: "bankName", type: "string" },
      { name: "accountName", type: "string" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "confirmDeposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "mintTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "accountNumber", type: "string" },
      { name: "accountName", type: "string" },
      { name: "bankName", type: "string" },
    ],
    name: "burnTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
]

// Helper function to get ethers provider and signer
const getProviderAndSigner = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed")
  }

  await window.ethereum.request({ method: "eth_requestAccounts" })

  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const signer = provider.getSigner()
  return { provider, signer }
}

// Convert cNGN amount to the correct decimals (18 decimals)
const parseCNGNAmount = (amount: string) => {
  return ethers.utils.parseUnits(amount, TOKEN_DECIMALS)
}

// Approve cNGN to be spent by the DEX contract
export const approveCNGN = async (amount: string): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner()
    const cngnContract = new ethers.Contract(
      CNGN_CONTRACT_ADDRESS,
      [
        {
          constant: false,
          inputs: [
            { name: "_spender", type: "address" },
            { name: "_value", type: "uint256" },
          ],
          name: "approve",
          outputs: [{ name: "", type: "bool" }],
          payable: false,
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      signer,
    )

    const parsedAmount = parseCNGNAmount(amount)
    const tx = await cngnContract.approve(DEX_CONTRACT_ADDRESS, parsedAmount)

    await tx.wait()
    return tx.hash
  } catch (error: any) {
    console.error("Error approving cNGN:", error)
    throw new Error(error.message || "Failed to approve cNGN")
  }
}

// Deposit cNGN to the DEX contract
export const depositCNGN = async (amount: string): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner()
    const dexContract = new ethers.Contract(DEX_CONTRACT_ADDRESS, DEX_ABI, signer)

    const parsedAmount = parseCNGNAmount(amount)
    const tx = await dexContract.deposit(parsedAmount)

    await tx.wait()
    return tx.hash
  } catch (error: any) {
    console.error("Error depositing cNGN:", error)
    throw new Error(error.message || "Failed to deposit cNGN")
  }
}

// Withdraw USDC from the DEX contract
export const withdrawUSDC = async (amount: string): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner()
    const dexContract = new ethers.Contract(DEX_CONTRACT_ADDRESS, DEX_ABI, signer)

    const parsedAmount = parseCNGNAmount(amount)
    const tx = await dexContract.withdraw(parsedAmount)

    await tx.wait()
    return tx.hash
  } catch (error: any) {
    console.error("Error withdrawing USDC:", error)
    throw new Error(error.message || "Failed to withdraw USDC")
  }
}

// Bridge cNGN to another chain
export const bridgeCNGN = async (amount: string, chainId: number): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner()
    const dexContract = new ethers.Contract(DEX_CONTRACT_ADDRESS, DEX_ABI, signer)

    const parsedAmount = parseCNGNAmount(amount)
    const tx = await dexContract.bridge(parsedAmount, chainId)

    await tx.wait()
    return tx.hash
  } catch (error: any) {
    console.error("Error bridging cNGN:", error)
    throw new Error(error.message || "Failed to bridge cNGN")
  }
}

// Update the generateVirtualAccount function to use the API instead
import { generateVirtualAccountAPI, confirmDepositAPI } from "./api"

import { verifyBankAccountAPI, initiateOfframpAPI, initiateBridgeAPI, checkBridgeStatusAPI } from "./api"

// Generate virtual account for fiat deposit
export const generateVirtualAccount = async (
  amount: string,
): Promise<{
  accountNumber: string
  bankName: string
  accountName: string
}> => {
  if (!window.ethereum?.selectedAddress) {
    throw new Error("No wallet address found")
  }

  try {
    const response = await generateVirtualAccountAPI(amount)

    if (!response.status) {
      throw new Error(response.message)
    }

    // Store the reference and expiry in localStorage for later use
    localStorage.setItem("virtualAccountRef", response.data.reference)
    localStorage.setItem("virtualAccountExpiry", response.data.expiresAt)

    return {
      accountNumber: response.data.accountNumber,
      bankName: response.data.bankName,
      accountName: response.data.accountName,
    }
  } catch (error: any) {
    console.error("Error generating virtual account:", error)
    throw new Error(error.message || "Failed to generate virtual account. Please try again.")
  }
}

// Update the confirmDeposit function to use the API
export const confirmDeposit = async (amount: string): Promise<void> => {
  try {
    const reference = localStorage.getItem("virtualAccountRef")
    if (!reference) {
      throw new Error("Virtual account reference not found")
    }

    const expiryDate = localStorage.getItem("virtualAccountExpiry")
    if (expiryDate && new Date(expiryDate) < new Date()) {
      throw new Error("Virtual account has expired. Please generate a new one.")
    }

    const response = await confirmDepositAPI(reference, amount)

    if (!response.status) {
      throw new Error(response.message)
    }

    // Clear the stored reference and expiry after successful confirmation
    localStorage.removeItem("virtualAccountRef")
    localStorage.removeItem("virtualAccountExpiry")
  } catch (error: any) {
    console.error("Error confirming deposit:", error)
    throw new Error(error.message || "Failed to confirm deposit")
  }
}

// Mint tokens after confirmed deposit
export const mintTokens = async (amount: string): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner()
    const dexContract = new ethers.Contract(DEX_CONTRACT_ADDRESS, DEX_ABI, signer)

    // Call your contract's function to mint tokens
    const tx = await dexContract.mintTokens(amount)
    await tx.wait()

    return tx.hash
  } catch (error: any) {
    console.error("Error minting tokens:", error)
    throw new Error(error.message || "Failed to mint tokens")
  }
}

// Approve tokens to be spent by the contract
export const approveTokens = async (amount: string): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner()
    const tokenContract = new ethers.Contract(
      CNGN_CONTRACT_ADDRESS,
      [
        {
          constant: false,
          inputs: [
            { name: "_spender", type: "address" },
            { name: "_value", type: "uint256" },
          ],
          name: "approve",
          outputs: [{ name: "", type: "bool" }],
          payable: false,
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      signer,
    )

    const parsedAmount = parseCNGNAmount(amount)
    const tx = await tokenContract.approve(DEX_CONTRACT_ADDRESS, parsedAmount)
    await tx.wait()

    return tx.hash
  } catch (error: any) {
    console.error("Error approving tokens:", error)
    throw new Error(error.message || "Failed to approve tokens")
  }
}

// Burn tokens and initiate fiat transfer
export const burnTokens = async (
  amount: string,
  bankDetails: {
    accountNumber: string
    accountName: string
    bankName: string
  },
): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner()
    const dexContract = new ethers.Contract(DEX_CONTRACT_ADDRESS, DEX_ABI, signer)

    // Call your contract's function to burn tokens and initiate fiat transfer
    const tx = await dexContract.burnTokens(
      parseCNGNAmount(amount),
      bankDetails.accountNumber,
      bankDetails.accountName,
      bankDetails.bankName,
    )

    await tx.wait()
    return tx.hash
  } catch (error: any) {
    console.error("Error burning tokens:", error)
    throw new Error(error.message || "Failed to burn tokens")
  }
}

// Verify bank account before offramp
export const verifyBankAccount = async (
  accountNumber: string,
  bankCode: string,
): Promise<{
  accountName: string
  isValid: boolean
}> => {
  try {
    const response = await verifyBankAccountAPI(accountNumber, bankCode)

    if (!response.status) {
      throw new Error(response.message)
    }

    return {
      accountName: response.data.accountName,
      isValid: response.data.isValid,
    }
  } catch (error: any) {
    console.error("Error verifying bank account:", error)
    throw new Error(error.message || "Failed to verify bank account. Please try again.")
  }
}

// Initiate offramp process
export const initiateOfframp = async (
  amount: string,
  bankDetails: {
    accountNumber: string
    accountName: string
    bankName: string
    bankCode: string
  },
): Promise<{
  reference: string
  estimatedTime: string
}> => {
  try {
    const response = await initiateOfframpAPI(amount, bankDetails)

    if (!response.status) {
      throw new Error(response.message)
    }

    return {
      reference: response.data.reference,
      estimatedTime: response.data.estimatedTime,
    }
  } catch (error: any) {
    console.error("Error initiating offramp:", error)
    throw new Error(error.message || "Failed to initiate offramp. Please try again.")
  }
}

// Initiate bridge process
export const initiateBridge = async (
  amount: string,
  sourceChain: string,
  destinationChain: string,
): Promise<{
  reference: string
  estimatedTime: string
}> => {
  try {
    const response = await initiateBridgeAPI(amount, sourceChain, destinationChain)

    if (!response.status) {
      throw new Error(response.message)
    }

    return {
      reference: response.data.reference,
      estimatedTime: response.data.estimatedTime,
    }
  } catch (error: any) {
    console.error("Error initiating bridge:", error)
    throw new Error(error.message || "Failed to initiate bridge. Please try again.")
  }
}

// Check bridge status
export const checkBridgeStatus = async (
  reference: string,
): Promise<{
  status: "pending" | "processing" | "completed" | "failed"
  estimatedTime: string
}> => {
  try {
    const response = await checkBridgeStatusAPI(reference)

    if (!response.status) {
      throw new Error(response.message)
    }

    return {
      status: response.data.bridgeStatus,
      estimatedTime: response.data.estimatedTime,
    }
  } catch (error: any) {
    console.error("Error checking bridge status:", error)
    throw new Error(error.message || "Failed to check bridge status. Please try again.")
  }
}

// Declare ethers to avoid TypeScript errors
declare const ethers: any

