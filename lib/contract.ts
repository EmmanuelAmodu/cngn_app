import { chainConfigs, TOKEN_DECIMALS } from "./constants"
import { DEX_ABI, ERC20_ABI } from "./abi/dex-abi"

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

// Add this helper function to ensure the wallet is on the correct network
const ensureCorrectNetwork = async (chainId = 1): Promise<boolean> => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed")
  }

  const chainIdHex = await window.ethereum.request({
    method: "eth_chainId",
  })
  const currentChainId = Number.parseInt(chainIdHex, 16)

  if (currentChainId !== chainId) {
    // Prompt the user to switch networks
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })
      return true
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          const network = chainConfigs[chainId]
          if (!network) {
            throw new Error(`Network configuration not found for chain ID ${chainId}`)
          }

          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          })

          // After adding the network, try to switch to it again
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          })

          return true
        } catch (addError) {
          console.error("Error adding network:", addError)
          throw new Error(`Failed to add network: ${addError instanceof Error ? addError.message : "Unknown error"}`)
        }
      } else {
        throw new Error(
          `Please switch your wallet to ${chainConfigs[chainId]?.name || "the correct"} network to continue`,
        )
      }
    }
  }

  return true
}

// Approve cNGN to be spent by the DEX contract
export const approveCNGN = async (amount: string, chainId = 1): Promise<string> => {
  try {
    // Ensure wallet is on the correct network
    await ensureCorrectNetwork(chainId)

    const { signer } = await getProviderAndSigner()
    const tokenAddress = chainConfigs[chainId]?.tokenAddress
    const cngnContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)

    const contractAddress = chainConfigs[chainId]?.contractAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
    const parsedAmount = parseCNGNAmount(amount)
    const tx = await cngnContract.approve(contractAddress, parsedAmount)

    await tx.wait()
    return tx.hash
  } catch (error: any) {
    console.error("Error approving cNGN:", error)
    throw new Error(error.message || "Failed to approve cNGN")
  }
}

// Deposit cNGN to the DEX contract
export const depositCNGN = async (amount: string, chainId = 1): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner()
    const contractAddress = chainConfigs[chainId]?.contractAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
    const dexContract = new ethers.Contract(contractAddress, DEX_ABI, signer)

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
export const withdrawUSDC = async (amount: string, chainId = 1): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner()
    const contractAddress = chainConfigs[chainId]?.contractAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
    const dexContract = new ethers.Contract(contractAddress, DEX_ABI, signer)

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
export const bridgeCNGN = async (amount: string, destinationChainId: number, sourceChainId = 1): Promise<string> => {
  try {
    // Ensure wallet is on the correct network
    await ensureCorrectNetwork(sourceChainId)

    const { signer } = await getProviderAndSigner()
    const contractAddress = chainConfigs[sourceChainId]?.contractAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
    const dexContract = new ethers.Contract(contractAddress, DEX_ABI, signer)

    // Generate a unique bridge ID
    const bridgeId = ethers.utils.randomBytes(32)

    const parsedAmount = parseCNGNAmount(amount)
    const tx = await dexContract.bridgeFrom(parsedAmount, destinationChainId, bridgeId)

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
export const mintTokens = async (amount: string, chainId = 1): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner()
    const contractAddress = chainConfigs[chainId]?.contractAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
    const dexContract = new ethers.Contract(contractAddress, DEX_ABI, signer)

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
export const approveTokens = async (amount: string, chainId = 1): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner()
    const tokenAddress = chainConfigs[chainId]?.tokenAddress
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)

    const contractAddress = chainConfigs[chainId]?.contractAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
    const parsedAmount = parseCNGNAmount(amount)
    const tx = await tokenContract.approve(contractAddress, parsedAmount)
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
  chainId = 1,
): Promise<string> => {
  try {
    // Ensure wallet is on the correct network
    await ensureCorrectNetwork(chainId)

    const { signer } = await getProviderAndSigner()
    const contractAddress = chainConfigs[chainId]?.contractAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
    const dexContract = new ethers.Contract(contractAddress, DEX_ABI, signer)

    // Generate a unique offramp ID
    const offRampId = ethers.utils.randomBytes(32)

    // Call your contract's function to burn tokens and initiate fiat transfer
    const tx = await dexContract.withdraw(parseCNGNAmount(amount), offRampId)

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
  chainId = 1,
): Promise<{
  reference: string
  estimatedTime: string
}> => {
  try {
    const response = await initiateOfframpAPI(amount, bankDetails, chainId)

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
  sourceChainId = 1,
): Promise<{
  reference: string
  estimatedTime: string
}> => {
  try {
    const response = await initiateBridgeAPI(amount, sourceChain, destinationChain, sourceChainId)

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

