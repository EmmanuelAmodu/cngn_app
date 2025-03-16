import { erc20Abi } from "viem";
import { DEX_ABI } from "./abi/dex-abi";
import { getPublicClient, getTokenAddress } from "./blockchain";
import { chainConfigs } from "./constants";
import { initiateTransfer } from "./paystack-client";
import { supabaseAdmin } from "./supabase";
import Bull from "bull";

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
    const { data, error } = await supabaseAdmin
      .from("offramp")
      .select("*")
      .eq("status", "pending")
      .limit(100);

    if (error) {
      console.error("Error fetching pending off ramps:", error);
    }

    if (!data) {
      console.log("No pending off ramps found");
      await new Promise((resolve) => setTimeout(resolve, 10000));
      continue;
    }

    for (const offRamp of data) {
      const {
        offramp_id,
        chain_id,
      } = offRamp;
      try {
        const publicClient = getPublicClient(chain_id);

        const decimals = await publicClient.readContract({
          address: getTokenAddress(chain_id),
          functionName: 'decimals',
          abi: erc20Abi
        });

        const [amount, offRampId] = await publicClient.readContract({
          address: chainConfigs[chain_id].contractAddress as `0x${string}`,
          abi: DEX_ABI,
          functionName: "offRampRecords",
          args: [
            offramp_id as `0x${string}`,
          ],
        });

        if (Number(amount) === 0) {
          console.log(`Offramp ${offramp_id} not found`);
          continue;
        }

        const amountInt = Number(amount) / (10 ** decimals)
        await offRampQueue.add(
          { offRampId },
          { delay: 5000 }
        );

        await supabaseAdmin
          .from("offramp")
          .update({
            status: "queued",
            amount: amountInt,
          })
          .eq("offramp_id", offRamp.offramp_id);
  
      } catch (error) {
        console.error(`Error processing bridge ${offramp_id}:`, error);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

export async function processWithdrawal(offrampId: string) {
    const { data: offramp, error: offrampError } = await supabaseAdmin
    .from("offramp")
    .select("*")
    .eq("offramp_id", offrampId)
    .eq("status", "queued")
    .single();

  if (offrampError || !offramp) {
    throw new Error("Failed to get offramp details");
  }
  
  try {
    // Update withdrawal status to completed
    await supabaseAdmin
    .from("offramp")
    .update({
      status: "processing",
    })
    .eq("offramp_id", offrampId);
    
    // Send NGN to bank account
    const transfer = await initiateTransfer(
      offramp.amount,
      offramp.recipientId,
      offrampId,
      "Payout from Pepper",
    );

    // Update withdrawal status to completed
    await supabaseAdmin
      .from("offramp")
      .update({
        status: "completed",
        bank_transfer_reference: transfer.reference,
      })
      .eq("offramp_id", offrampId);

    console.log(`Withdrawal ${offrampId} processed successfully`);
  } catch (error) {
    console.error(`Error processing withdrawal ${offrampId}:`, error);

    // Update withdrawal status to failed
    await supabaseAdmin
      .from("offramp")
      .update({
        status: "failed",
        processed: true,
      })
      .eq("offramp_id", offrampId);
  }
}
