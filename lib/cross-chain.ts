import { createPublicClient, createWalletClient, http, type Hash } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { chainConfigs } from "@/lib/constants"

// Mock successful transaction 95% of the time
const MOCK_SUCCESS_RATE = 0.95

// Get and validate private key
const getPrivateKey = () => {
  const key = process.env.ADMIN_PRIVATE_KEY
  if (!key) {
    throw new Error("ADMIN_PRIVATE_KEY is not configured")
  }
  // Ensure key has 0x prefix
  return key.startsWith("0x") ? key : `0x${key}`
}

// Create wallet clients for each chain
const createChainClients = () => {
  try {
    const privateKey = getPrivateKey()

    return Object.entries(chainConfigs).reduce(
      (acc, [chainId, config]) => {
        const publicClient = createPublicClient({
          chain: config.chain,
          transport: http(config.rpcUrl),
        })

        const account = privateKeyToAccount(privateKey as `0x${string}`)
        const walletClient = createWalletClient({
          account,
          chain: config.chain,
          transport: http(config.rpcUrl),
        })

        return {
          ...acc,
          [chainId]: {
            publicClient,
            walletClient,
          },
        }
      },
      {} as Record<string, { publicClient: any; walletClient: any }>,
    )
  } catch (error) {
    console.error("Error creating chain clients:", error)
    throw error
  }
}

// Initialize clients lazily
let chainClients: Record<string, { publicClient: any; walletClient: any }> | null = null

const getChainClients = () => {
  if (!chainClients) {
    chainClients = createChainClients()
  }
  return chainClients
}

export async function sendCNGNOnDestinationChain(
  destinationChainId: number,
  userAddress: string,
  amount: bigint,
  sourceChainId: number,
  bridgeId: string,
): Promise<{ txHash: Hash }> {
  try {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Mock failure based on success rate
    if (Math.random() > MOCK_SUCCESS_RATE) {
      throw new Error("Bridge transaction failed")
    }

    const chainConfig = chainConfigs[destinationChainId]
    if (!chainConfig) {
      throw new Error("Unsupported destination chain")
    }

    const clients = getChainClients()
    const { walletClient } = clients[destinationChainId]

    if (!walletClient) {
      throw new Error(`No wallet client available for chain ${destinationChainId}`)
    }

    // Call bridgeTo on the destination chain
    const hash = await walletClient.writeContract({
      address: chainConfig.contractAddress as `0x${string}`,
      abi: [
        {
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "sourceChainId", type: "uint8" },
            { name: "bridgeId", type: "bytes32" },
          ],
          name: "bridgeTo",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "bridgeTo",
      args: [userAddress as `0x${string}`, amount, sourceChainId as number, bridgeId as `0x${string}`],
    })

    return { txHash: hash }
  } catch (error) {
    console.error("Error sending cNGN on destination chain:", error)
    throw error
  }
}

