import { mainnet, polygon, arbitrum, optimism, base } from "viem/chains"

// Contract addresses
export const CNGN_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x5678901234567890123456789012345678901234"
export const DEX_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x1234567890123456789012345678901234567890"

// Chain configurations
export const chainConfigs = {
  1: {
    name: "Ethereum",
    cngnTokenAddress: "0x",
    dexContractAddress: "0x",
    rpcUrl: "https://mainnet.infura.io/v3/",
    chain: mainnet,
  },
  137: {
    name: "Polygon",
    cngnTokenAddress: "0x",
    dexContractAddress: "0x",
    rpcUrl: "https://polygon-mainnet.infura.io/v3/",
    chain: polygon,
  },
  42161: {
    name: "Arbitrum",
    cngnTokenAddress: "0x",
    dexContractAddress: "0x",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    chain: arbitrum,
  },
  10: {
    name: "Optimism",
    cngnTokenAddress: "0x",
    dexContractAddress: "0x",
    rpcUrl: "https://mainnet.optimism.io",
    chain: optimism,
  },
  8453: {
    name: "Base",
    cngnTokenAddress: "0x",
    dexContractAddress: "0x",
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

