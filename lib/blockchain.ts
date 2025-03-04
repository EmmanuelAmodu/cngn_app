import { createPublicClient, createWalletClient, http, type Address, type WalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { mainnet } from "viem/chains"
import { CNGN_CONTRACT_ADDRESS, DEX_CONTRACT_ADDRESS } from "./constants"

// Contract ABI
export const contractABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "onrampId", type: "bytes32" },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "offRampId", type: "bytes32" },
    ],
    name: "Withdrawal",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "destinationChainId", type: "uint256" },
    ],
    name: "Bridge",
    type: "event",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onrampId", type: "bytes32" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

// Configuration
if (!process.env.NEXT_PUBLIC_RPC_URL) {
  throw new Error("NEXT_PUBLIC_RPC_URL is not defined")
}

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL
export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address) || (DEX_CONTRACT_ADDRESS as Address)
export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS as Address) || (CNGN_CONTRACT_ADDRESS as Address)

// Initialize clients
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL),
})

let walletClient: WalletClient | null = null

export function initializeWalletClient(privateKey: string) {
  try {
    console.log("Initializing wallet client...")
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(RPC_URL),
    })
    console.log("Wallet client initialized successfully")
    return walletClient
  } catch (error) {
    console.error("Error initializing wallet client:", error)
    throw error
  }
}

export function getWalletClient() {
  if (!walletClient) {
    console.log("Initializing wallet client with admin private key...")
    if (!process.env.ADMIN_PRIVATE_KEY) {
      throw new Error("ADMIN_PRIVATE_KEY is not defined")
    }
    return initializeWalletClient(process.env.ADMIN_PRIVATE_KEY)
  }
  return walletClient
}

