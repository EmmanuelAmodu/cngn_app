import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Hash,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainConfigs } from "@/lib/constants";
import { DEX_ABI } from "./abi/dex-abi";

// Get and validate private key
const getPrivateKey = () => {
  const key = process.env.ADMIN_PRIVATE_KEY;
  if (!key) {
    throw new Error("ADMIN_PRIVATE_KEY is not configured");
  }
  // Ensure key has 0x prefix
  return key.startsWith("0x") ? key : `0x${key}`;
};

// Create wallet clients for each chain
const createChainClients = () => {
  try {
    const privateKey = getPrivateKey();

    return Object.entries(chainConfigs).reduce(
      (
        acc: Record<
          string,
          {
            publicClient: PublicClient;
            walletClient: WalletClient;
            account: Account;
          }
        >,
        [chainId, config]
      ) => {
        const publicClient = createPublicClient({
          chain: config.chain,
          transport: http(config.rpcUrl),
        });

        const account = privateKeyToAccount(privateKey as `0x${string}`);
        const walletClient = createWalletClient({
          account,
          chain: config.chain,
          transport: http(config.rpcUrl),
        });

        return Object.assign(acc, {
          [chainId]: {
            publicClient,
            walletClient,
            account,
          },
        });
      },
      {} as Record<
        string,
        {
          publicClient: PublicClient;
          walletClient: WalletClient;
          account: Account;
        }
      >
    );
  } catch (error) {
    console.error("Error creating chain clients:", error);
    throw error;
  }
};

// Initialize clients lazily
let chainClients: Record<
  string,
  { publicClient: PublicClient; walletClient: WalletClient; account: Account }
> | null = null;

const getChainClients = () => {
  if (!chainClients) {
    chainClients = createChainClients();
  }
  return chainClients;
};

export async function sendCNGNOnDestinationChain(
  destinationChainId: number,
  userAddress: string,
  amount: bigint,
  sourceChainId: number,
  bridgeId: string
): Promise<{ txHash: Hash }> {
  try {
    const chainConfig = chainConfigs[destinationChainId];
    if (!chainConfig) {
      throw new Error("Unsupported destination chain");
    }

    const clients = getChainClients();
    const { walletClient } = clients[destinationChainId];

    if (!walletClient) {
      throw new Error(
        `No wallet client available for chain ${destinationChainId}`
      );
    }

    // Call bridgeTo on the destination chain using the contract address from chainConfigs
    const hash = await walletClient.writeContract({
      address: chainConfig.contractAddress as `0x${string}`,
      abi: DEX_ABI,
      functionName: "bridgeTo",
      args: [
        userAddress as `0x${string}`,
        amount,
        sourceChainId as number,
        bridgeId as `0x${string}`,
      ],
      chain: chainConfig.chain,
      account: clients[destinationChainId].account,
    });

    return { txHash: hash };
  } catch (error) {
    console.error("Error sending cNGN on destination chain:", error);
    throw error;
  }
}
