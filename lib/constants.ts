import type { Address } from "viem";
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  type Chain,
} from "viem/chains";

// Chain configurations
export const chainConfigs: {
  [key: number]: {
    name: string;
    tokenAddress: Address;
    contractAddress: Address;
    rpcUrl: string;
    chain: Chain;
  };
} = {
  // 1: {
  //   name: "Ethereum",
  //   tokenAddress: "0x46C85152bFe9f96829aA94755D9f915F9B10EF5F",
  //   contractAddress: "0x0e85B746fbB2d1848a86CE83786E4E778C68228A",
  //   rpcUrl: "https://eth.drpc.org/",
  //   chain: mainnet,
  // },
  // 137: {
  //   name: "Polygon",
  //   tokenAddress: "0x46C85152bFe9f96829aA94755D9f915F9B10EF5F",
  //   contractAddress: "0x0e85B746fbB2d1848a86CE83786E4E778C68228A",
  //   rpcUrl: "wss://polygon.drpc.org",
  //   chain: polygon,
  // },
  // 42161: {
  //   name: "Arbitrum",
  //   tokenAddress: "0x46C85152bFe9f96829aA94755D9f915F9B10EF5F",
  //   contractAddress: "0x0e85B746fbB2d1848a86CE83786E4E778C68228A",
  //   rpcUrl: "https://arbitrum.drpc.org/",
  //   chain: arbitrum,
  // },
  // 10: {
  //   name: "Optimism",
  //   tokenAddress: "0x46C85152bFe9f96829aA94755D9f915F9B10EF5F",
  //   contractAddress: "0x0e85B746fbB2d1848a86CE83786E4E778C68228A",
  //   rpcUrl: "https://optimism.drpc.org/",
  //   chain: optimism,
  // },
  8453: {
    name: "Base",
    tokenAddress: "0x46C85152bFe9f96829aA94755D9f915F9B10EF5F",
    contractAddress: "0x0e85B746fbB2d1848a86CE83786E4E778C68228A",
    rpcUrl: "https://base.drpc.org/",
    chain: base,
  },
};

// Simple mapping of chain IDs to names
export const SUPPORTED_CHAINS = {
  // 1: "Ethereum",
  // 137: "Polygon",
  // 42161: "Arbitrum",
  // 10: "Optimism",
  8453: "Base",
};

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
};

// Token decimals
export const TOKEN_DECIMALS = 18;
