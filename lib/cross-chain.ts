import type { Hash } from "viem";
import { chainConfigs } from "@/lib/constants";
import { DEX_ABI } from "./abi/dex-abi";
import Bull from "bull";
import { getPublicClient, getWalletClient } from "./blockchain";
import { prisma } from "./database";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error("Redis URL not defined");
}

const bridgeQueue = new Bull("bridge_queue", {
  redis: REDIS_URL,
});

export async function crossChainPolling() {
  bridgeQueue.process(async (job) => {
    const { bridgeId, userAddress, amount, sourceChainId, destinationChainId } = job.data;
    await processBridgeFrom(bridgeId, userAddress, BigInt(amount), sourceChainId, destinationChainId);
  });

  while (true) {
    const data = await prisma.bridge.findMany({
      where: { status: 'pending' },
      take: 100,
    })

    if (!data) {
      console.log("No pending bridges found");
      await new Promise((resolve) => setTimeout(resolve, 30000));
      continue;
    }

    for (const bridge of data) {
      const {
        bridgeId,
        sourceChainId,
      } = bridge;
      try {
        const publicClient = getPublicClient(sourceChainId);

        const [userAddress, amount, destinationChainIdFromContract, bridgeIdFromContract] = await publicClient.readContract({
          address: chainConfigs[sourceChainId].contractAddress as `0x${string}`,
          abi: DEX_ABI,
          functionName: "bridgeEntryRecords",
          args: [
            bridgeId as `0x${string}`,
          ],
        });

        await bridgeQueue.add(
          { bridgeId: bridgeIdFromContract, userAddress, amount, sourceChainId, destinationChainId: destinationChainIdFromContract },
          { delay: 5000 }
        );

        await prisma.bridge.update({
          where: { bridgeId: bridge.bridgeId },
          data: {
            status: "queued",
            amount: Number(amount),
            userAddress,
            sourceChainId: sourceChainId,
          }
        })
  
      } catch (error) {
        console.error(`Error processing bridge ${bridgeId}:`, error);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
}

async function sendCNGNOnDestinationChain(
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
    
    const publicClient = getPublicClient(destinationChainId);
    const walletClient = getWalletClient(destinationChainId);

    if (!walletClient.account) {
      throw new Error(
        `No wallet client available for chain ${destinationChainId}`
      );
    }

    // Call bridgeTo on the destination chain using the contract address from chainConfigs
    const hash = await walletClient.writeContract({
      address: chainConfig.contractAddress as `0x${string}`,
      abi: DEX_ABI,
      functionName: "bridgeExit",
      args: [
        userAddress as `0x${string}`,
        amount,
        sourceChainId as number,
        bridgeId as `0x${string}`,
      ],
      chain: chainConfig.chain,
      account: walletClient.account,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });
 
    console.log(
      `Sent cNGN on destination chain ${destinationChainId}: ${hash}`,
      receipt
    );

    return { txHash: hash };
  } catch (error) {
    console.error("Error sending cNGN on destination chain:", error);
    throw error;
  }
}

async function processBridgeFrom(
  bridgeId: string,
  userAddress: string,
  amount: bigint,
  sourceChainId: number,
  destinationChainId: number
) {
  try {
    const data = await prisma.bridge.findFirst({
      where: {
        bridgeId, 
        status: "queued"
      },
    })

    if (!data) {
      console.log(`Bridge ${bridgeId} not found or already processed`);
      return;
    }

    await prisma.bridge.update({
      where: { bridgeId },
      data: { status: "processing" }
    })

    // Send cNGN on destination chain
    const result = await sendCNGNOnDestinationChain(
      destinationChainId,
      userAddress,
      amount,
      sourceChainId,
      bridgeId
    );

    await prisma.bridge.update({
      where: { bridgeId },
      data: {
        status: "completed",
        destinationTxHash: result.txHash,
      }
    })

    console.log(`Bridge ${bridgeId} processed successfully`);
  } catch (error) {
    console.error(`Error processing bridge ${bridgeId}:`, error);

    await prisma.bridge.update({
      where: { bridgeId },
      data: {
        status: "failed",
      }
    })
  }
}
