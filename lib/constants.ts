import { mainnet, polygon, arbitrum, optimism, base, type Chain } from "viem/chains"

// Chain configurations
export const chainConfigs: {
  [key: number]: {
    name: string
    tokenAddress: string
    contractAddress: string
    rpcUrl: string
    chain: Chain
  }
} = {
  1: {
    name: "Ethereum",
    tokenAddress: "0x5678901234567890123456789012345678901234",
    contractAddress: "0x1234567890123456789012345678901234567890",
    rpcUrl: "https://mainnet.infura.io/v3/",
    chain: mainnet,
  },
  137: {
    name: "Polygon",
    tokenAddress: "0x5678901234567890123456789012345678901234",
    contractAddress: "0x1234567890123456789012345678901234567890",
    rpcUrl: "https://polygon-mainnet.infura.io/v3/",
    chain: polygon,
  },
  42161: {
    name: "Arbitrum",
    tokenAddress: "0x5678901234567890123456789012345678901234",
    contractAddress: "0x1234567890123456789012345678901234567890",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    chain: arbitrum,
  },
  10: {
    name: "Optimism",
    tokenAddress: "0x5678901234567890123456789012345678901234",
    contractAddress: "0x1234567890123456789012345678901234567890",
    rpcUrl: "https://mainnet.optimism.io",
    chain: optimism,
  },
  8453: {
    name: "Base",
    tokenAddress: "0x5678901234567890123456789012345678901234",
    contractAddress: "0x1234567890123456789012345678901234567890",
    rpcUrl: "https://base.chain",
    chain: base,
  },
}

// Simple mapping of chain IDs to names
export const SUPPORTED_CHAINS = {
  1: "Ethereum",
  137: "Polygon",
  42161: "Arbitrum",
  10: "Optimism",
  8453: "Base",
}

// API endpoints
export const API_ENDPOINTS = {
  generateVirtualAccount: "/api/onramp/initiate",
  confirmDeposit: "/api/deposit",
  verifyBankAccount: "/api/verify/bank-account",
  initiateOfframp: "/api/register/offramp",
  initiateBridge: "/api/bridge/initiate",
  checkBridgeStatus: "/api/bridge/status",
  getSupportedChains: "/api/chains",
  getSupportedBanks: "/api/banks",
  getTransactionStats: "/api/stats",
  checkWithdrawalStatus: "/api/withdrawal/status",
}

// Token decimals
export const TOKEN_DECIMALS = 18

