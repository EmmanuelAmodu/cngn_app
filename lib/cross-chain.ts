import type { Hash } from "viem";
import { chainConfigs } from "@/lib/constants";
import { DEX_ABI } from "./abi/dex-abi";
import { supabaseAdmin } from "./supabase";
import Bull from "bull";
import { getPublicClient, getWalletClient } from "./blockchain";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error("Redis URL not defined");
}

const bridgeQueue = new Bull("bridge_queue", {
  redis: REDIS_URL,
});

export async function crossChainPolling() {
  bridgeQueue.process(async (job) => {
    const { bridge_id, user_address, amount, source_chain_id, destination_chain_id } = job.data;
    await processBridgeFrom(bridge_id, user_address, BigInt(amount), source_chain_id, destination_chain_id);
  });

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("bridges")
      .select("*")
      .eq("status", "pending")
      .limit(100);

    if (error) {
      console.error("Error fetching pending bridges:", error);
    }

    if (!data) {
      console.log("No pending bridges found");
      await new Promise((resolve) => setTimeout(resolve, 10000));
      continue;
    }

    for (const bridge of data) {
      const {
        bridge_id,
        source_chain_id,
        destination_chain_id,
      } = bridge;
      try {
        const publicClient = getPublicClient(source_chain_id);

        const [to, amount, destinationChainIdFromContract, bridgeId] = await publicClient.readContract({
          address: chainConfigs[source_chain_id].contractAddress as `0x${string}`,
          abi: DEX_ABI,
          functionName: "bridgeEntryRecords",
          args: [
            bridge_id as `0x${string}`,
          ],
        });

        await bridgeQueue.add(
          { bridge_id: bridgeId, user_address: to, amount, source_chain_id, destination_chain_id },
          { delay: 5000 }
        );

        await supabaseAdmin
          .from("bridges")
          .update({
            status: "queued",
            amount: BigInt(amount),
            user_address: to,
            source_chain_id: source_chain_id,
          })
          .eq("bridge_id", bridge.bridge_id);
  
      } catch (error) {
        console.error(`Error processing bridge ${bridge_id}:`, error);
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
    // Update status to processing
    const { data, error } = await supabaseAdmin
      .from("bridges")
      .select("*")
      .eq("bridge_id", bridgeId)
      .eq("status", "queued")
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      console.log(`Bridge ${bridgeId} not found or already processed`);
      return;
    }
  
    await supabaseAdmin
      .from("bridges")
      .update({ status: "processing" })
      .eq("bridge_id", bridgeId);

    // Send cNGN on destination chain
    const result = await sendCNGNOnDestinationChain(
      destinationChainId,
      userAddress,
      amount,
      sourceChainId,
      bridgeId
    );

    // Update bridge status to completed
    await supabaseAdmin
      .from("bridges")
      .update({
        status: "completed",
        destination_tx_hash: result.txHash,
        processed: true,
      })
      .eq("bridge_id", bridgeId);

    console.log(`Bridge ${bridgeId} processed successfully`);
  } catch (error) {
    console.error(`Error processing bridge ${bridgeId}:`, error);

    // Update bridge status to failed
    await supabaseAdmin
      .from("bridges")
      .update({
        status: "failed",
        processed: true,
      })
      .eq("bridge_id", bridgeId);
  }
}
