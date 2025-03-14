import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type WalletClient,
  type Chain,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { chainConfigs } from "./constants";
import { DEX_ABI } from "./abi/dex-abi";

export const getContractAddress = (chainId: number): Address => {
  return (
    (chainConfigs[chainId]?.contractAddress as Address)
  );
};

export const getTokenAddress = (chainId: number): Address => {
  return chainConfigs[chainId].tokenAddress as Address;
};

export const getChain = (chainId = 1): Chain => {
  return chainConfigs[chainId]?.chain || mainnet;
};

let walletClient: WalletClient | null = null;

// Create a public client for a specific chain
export const getPublicClient = (chainId: number) => {
  const chain = getChain(chainId);
  const rpcUrl = chainConfigs[chainId].rpcUrl;

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
};

export function initializeWalletClient(privateKey: string, chainId: number) {
  console.log("Chain ID", chainId);
  try {
    console.log("Initializing wallet client...");
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const chain = getChain(chainId);
    const rpcUrl = chainConfigs[chainId].rpcUrl;

    walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    console.log("Wallet client initialized successfully");
    return walletClient;
  } catch (error) {
    console.error("Error initializing wallet client:", error);
    throw error;
  }
}

export function getWalletClient(chainId: number) {
  if (!walletClient) {
    console.log("Initializing wallet client with admin private key...");
    if (!process.env.ADMIN_PRIVATE_KEY) {
      throw new Error("ADMIN_PRIVATE_KEY is not defined");
    }
    return initializeWalletClient(process.env.ADMIN_PRIVATE_KEY, chainId);
  }
  return walletClient;
}

// Export the contract ABI
export { DEX_ABI as contractABI };
