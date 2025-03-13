import { createPublicClient, createWalletClient, http, type Address, type WalletClient, type Chain } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { mainnet } from "viem/chains"
import { chainConfigs } from "./constants"
import { DEX_ABI } from "./abi/dex-abi"

export const getContractAddress = (chainId = 1): Address => {
  return (
    (chainConfigs[chainId]?.contractAddress as Address) ||
    (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address) ||
    ("0x1234567890123456789012345678901234567890" as Address)
  )
}

export const getTokenAddress = (chainId = 1): Address => {
  return (
    (chainConfigs[chainId]?.tokenAddress as Address)
  )
}

export const getChain = (chainId = 1): Chain => {
  return chainConfigs[chainId]?.chain || mainnet
}

// Create a public client for a specific chain
export const getPublicClient = (chainId = 1) => {
  const chain = getChain(chainId)
  const rpcUrl = chainConfigs[chainId].rpcUrl

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
}

let walletClient: WalletClient | null = null

export function initializeWalletClient(privateKey: string, chainId = 1) {
  console.log("Chain ID", chainId)
  try {
    console.log("Initializing wallet client...")
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    const chain = getChain(chainId)
    const rpcUrl = chainConfigs[chainId].rpcUrl

    walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    })
    console.log("Wallet client initialized successfully")
    return walletClient
  } catch (error) {
    console.error("Error initializing wallet client:", error)
    throw error
  }
}

export function getWalletClient(chainId = 1) {
  if (!walletClient) {
    console.log("Initializing wallet client with admin private key...")
    if (!process.env.ADMIN_PRIVATE_KEY) {
      throw new Error("ADMIN_PRIVATE_KEY is not defined")
    }
    return initializeWalletClient(process.env.ADMIN_PRIVATE_KEY, chainId)
  }
  return walletClient
}

// Export the contract ABI
export { DEX_ABI as contractABI }

