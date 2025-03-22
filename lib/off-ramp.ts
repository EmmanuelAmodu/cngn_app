import { erc20Abi } from "viem";
import { DEX_ABI } from "./abi/dex-abi";
import { getPublicClient, getTokenAddress } from "./blockchain";
import { chainConfigs, POLLING_DELAY } from "./constants";
import { initiateTransfer } from "./paystack-client";
import Bull from "bull";
import { prisma } from "./database";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error("Redis URL not defined");
}

const offRampQueue = new Bull("offramp_queue", {
  redis: REDIS_URL,
});

export async function offRampPolling() {
  offRampQueue.process(async (job) => {
    const { transactionId } = job.data;
    await processWithdrawal(transactionId);
  });

  while (true) {
    console.log("Polling for pending off ramps");
    const data = await prisma.transaction.findMany({
      where: { 
        status: 'pending',
        type: 'offramp'
      },
      take: 100
    })

    if (!data) {
      console.log("No pending off ramps found");
      await new Promise((resolve) => setTimeout(resolve, POLLING_DELAY));
      continue;
    }

    for (const transaction of data) {
      const {
        id,
        chainId,
      } = transaction;
      try {
        if (!chainId) {
          console.error(`Chain ID missing for transaction ${id}`);
          continue;
        }

        const publicClient = getPublicClient(chainId);

        const decimals = await publicClient.readContract({
          address: getTokenAddress(chainId),
          functionName: 'decimals',
          abi: erc20Abi
        });

        const [amount, transactionId] = await publicClient.readContract({
          address: chainConfigs[chainId].contractAddress as `0x${string}`,
          abi: DEX_ABI,
          functionName: "offRampRecords",
          args: [
            id as `0x${string}`,
          ],
        });

        if (Number(amount) === 0) {
          console.log(`Offramp ${id} not found`);
          continue;
        }

        const amountInt = Number(amount) / (10 ** decimals)
        await offRampQueue.add(
          { transactionId: id },
          { delay: 5000 }
        );

        await prisma.transaction.update({
          where: { id },
          data: {
            status: "queued",
            amount: amountInt,
          }
        })
  
      } catch (error) {
        console.error(`Error processing offramp ${id}:`, error);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLLING_DELAY));
  }
}

export async function processWithdrawal(transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      status: 'queued',
      type: 'offramp'
    }
  })

  if (!transaction) {
    throw new Error("Failed to get offramp details");
  }

  if (!transaction.recipientId) {
    throw new Error("Recipient ID missing for withdrawal");
  }

  try {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "processing",
      }
    })

    // Send NGN to bank account
    const transfer = await initiateTransfer(
      transaction.amount,
      transaction.recipientId,
      transactionId,
      "Payout from Pepper",
    );

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "completed",
        bankTransferReference: transfer.reference,
      }
    })

    console.log(`Withdrawal ${transactionId} processed successfully`);
  } catch (error) {
    console.error(`Error processing withdrawal ${transactionId}:`, error);

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "failed",
      }
    })
  }
}
