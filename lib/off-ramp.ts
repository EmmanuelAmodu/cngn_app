import { erc20Abi } from "viem";
import { DEX_ABI } from "./abi/dex-abi";
import { getPublicClient, getTokenAddress } from "./blockchain";
import { chainConfigs } from "./constants";
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
    const { offRampId } = job.data;
    await processWithdrawal(offRampId);
  });

  while (true) {
    const data = await prisma.offramp.findMany({
      where: { status: 'pending' },
      take: 100
    })

    if (!data) {
      console.log("No pending off ramps found");
      await new Promise((resolve) => setTimeout(resolve, 30000));
      continue;
    }

    for (const offRamp of data) {
      const {
        offrampId,
        chainId,
      } = offRamp;
      try {
        const publicClient = getPublicClient(chainId);

        const decimals = await publicClient.readContract({
          address: getTokenAddress(chainId),
          functionName: 'decimals',
          abi: erc20Abi
        });

        const [amount, offRampId] = await publicClient.readContract({
          address: chainConfigs[chainId].contractAddress as `0x${string}`,
          abi: DEX_ABI,
          functionName: "offRampRecords",
          args: [
            offrampId as `0x${string}`,
          ],
        });

        if (Number(amount) === 0) {
          console.log(`Offramp ${offrampId} not found`);
          continue;
        }

        const amountInt = Number(amount) / (10 ** decimals)
        await offRampQueue.add(
          { offRampId },
          { delay: 5000 }
        );

        await prisma.offramp.update({
          where: { offrampId },
          data: {
            status: "queued",
            amount: amountInt,
          }
        })
  
      } catch (error) {
        console.error(`Error processing bridge ${offrampId}:`, error);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
}

export async function processWithdrawal(offrampId: string) {
  const offramp = await prisma.offramp.findFirst({
    where: {
      offrampId,
      status: 'queued'
    }
  })

  if (!offramp) {
    throw new Error("Failed to get offramp details");
  }

  try {
    await prisma.offramp.update({
      where: { offrampId },
      data: {
        status: "processing",
      }
    })

    // Send NGN to bank account
    const transfer = await initiateTransfer(
      offramp.amount,
      offramp.recipientId,
      offrampId,
      "Payout from Pepper",
    );

    await prisma.offramp.update({
      where: { offrampId },
      data: {
        status: "completed",
        bankTransferReference: transfer.reference,
      }
    })

    console.log(`Withdrawal ${offrampId} processed successfully`);
  } catch (error) {
    console.error(`Error processing withdrawal ${offrampId}:`, error);

    await prisma.offramp.update({
      where: { offrampId },
      data: {
        status: "failed",
      }
    })
  }
}
