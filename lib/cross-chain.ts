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
    const { transactionId, userAddress, amount, sourceChainId, destinationChainId } = job.data;
    await processBridgeFrom(transactionId, userAddress, BigInt(amount), sourceChainId, destinationChainId);
  });

  while (true) {
    const data = await prisma.transaction.findMany({
      where: { 
        status: 'pending',
        type: 'bridge'
      },
      take: 100,
    })

    if (!data) {
      console.log("No pending bridges found");
      await new Promise((resolve) => setTimeout(resolve, 10000));
      continue;
    }

    for (const transaction of data) {
      const {
        id,
        sourceChainId,
      } = transaction;
      try {
        if (!sourceChainId) {
          console.error(`Source chain ID missing for transaction ${id}`);
          continue;
        }

        const publicClient = getPublicClient(sourceChainId);

        const [userAddress, amount, destinationChainIdFromContract, transactionIdFromContract] = await publicClient.readContract({
          address: chainConfigs[sourceChainId].contractAddress as `0x${string}`,
          abi: DEX_ABI,
          functionName: "bridgeEntryRecords",
          args: [
            id as `0x${string}`,
          ],
        });

        await bridgeQueue.add(
          { transactionId: transactionIdFromContract, userAddress, amount, sourceChainId, destinationChainId: destinationChainIdFromContract },
          { delay: 5000 }
        );

        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "queued",
            amount: Number(amount),
            userAddress,
            sourceChainId: sourceChainId,
          }
        })
  
      } catch (error) {
        console.error(`Error processing bridge ${id}:`, error);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

async function sendCNGNOnDestinationChain(
  destinationChainId: number,
  userAddress: string,
  amount: bigint,
  sourceChainId: number,
  transactionId: string
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
        transactionId as `0x${string}`,
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
  transactionId: string,
  userAddress: string,
  amount: bigint,
  sourceChainId: number,
  destinationChainId: number
) {
  try {
    const data = await prisma.transaction.findFirst({
      where: {
        id: transactionId, 
        status: "queued",
        type: 'bridge'
      },
    })

    if (!data) {
      console.log(`Bridge ${transactionId} not found or already processed`);
      return;
    }

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "processing" }
    })

    // Send cNGN on destination chain
    const result = await sendCNGNOnDestinationChain(
      destinationChainId,
      userAddress,
      amount,
      sourceChainId,
      transactionId
    );

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "completed",
        destinationTxHash: result.txHash,
      }
    })

    console.log(`Bridge ${transactionId} processed successfully`);
  } catch (error) {
    console.error(`Error processing bridge ${transactionId}:`, error);

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "failed",
      }
    })
  }
}
