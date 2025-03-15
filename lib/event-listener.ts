import {
  getContractAddress,
  contractABI,
  getPublicClient,
  getTokenAddress,
} from "./blockchain";
import { supabaseAdmin } from "./supabase";
import { sendCNGNOnDestinationChain } from "./cross-chain";
import { chainConfigs } from "./constants";
import { erc20Abi } from "viem";
import Bull from "bull";
import { createRecipient, initiateTransfer } from "./paystack-client";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error("Redis URL not defined");
}

const offrampQueue = new Bull("offramp_queue", {
  redis: REDIS_URL,
});

offrampQueue.process("process-withdrawal", async (job) => {
  const { offrampId, recipientId } = job.data;
  await processWithdrawal(offrampId, recipientId);
});

async function processWithdrawal(offrampId: string, recipientId: string) {
    // Get bank details from offramps table
    const { data: offramp, error: offrampError } = await supabaseAdmin
    .from("offramps")
    .select("*")
    .eq("offramp_id", offrampId)
    .single();

  if (offrampError || !offramp) {
    throw new Error("Failed to get offramp details");
  }

  if (offramp.status !== "processing") {
    console.log(`Withdrawal ${offrampId} not in processing state`);
    return;
  }
  
  try {
    // Send NGN to bank account
    const tranfer = await initiateTransfer(
      offramp.amount,
      recipientId,
      offrampId,
      offrampId,
    );

    // Update withdrawal status to completed
    await supabaseAdmin
      .from("withdrawals")
      .update({
        status: "completed",
        bank_transfer_reference: tranfer.reference,
      })
      .eq("offramp_id", offrampId);

    console.log(`Withdrawal ${offrampId} processed successfully`);
  } catch (error) {
    console.error(`Error processing withdrawal ${offrampId}:`, error);

    // Update withdrawal status to failed
    await supabaseAdmin
      .from("withdrawals")
      .update({
        status: "failed",
        processed: true,
      })
      .eq("id", offrampId);
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
    await supabaseAdmin
      .from("bridges")
      .update({ status: "processing" })
      .eq("id", bridgeId);

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
      .eq("id", bridgeId);

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
      .eq("id", bridgeId);
  }
}

export async function startEventListeners() {
  // Create event listeners for each supported chain
  const unsubscribers = Object.entries(chainConfigs).map(
    async ([chainIdStr, config]) => {
      const chainId = Number(chainIdStr);
      const client = getPublicClient(chainId);

      const decimals = await client.readContract({
        address: getTokenAddress(Number(chainId)),
        functionName: "decimals",
        abi: erc20Abi,
      });

      console.log(
        `Starting event listeners for chain ${chainId} (${config.name})`
      );

      // Watch for Withdrawal events on this chain
      const unsubscribeWithdrawal = client.watchContractEvent({
        address: getContractAddress(chainId),
        abi: contractABI,
        eventName: "OffRamp",
        onLogs: async (logs) => {
          for (const log of logs) {
            const { args } = log;
            if (!args) continue;

            const { amount, offRampId } = args;

            if (!amount || !offRampId) {
              console.error(
                `Invalid withdrawal event arguments on chain ${chainId}`
              );
              continue;
            }

            try {
              const { data: withdrawal, error } = await supabaseAdmin
                .from("withdrawals")
                .update({
                  amount: Number(amount) / 10 ** Number(decimals),
                  on_chain_tx_hash: log.transactionHash,
                  offramp_id: offRampId,
                  status: "processing",
                })
                .eq("offramp_id", offRampId)
                .select()
                .single();

              if (error) {
                throw error;
              }

              // Process the withdrawal
              await offrampQueue.add("process-withdrawal", {
                offrampId: offRampId,
              });
              // await processWithdrawal(withdrawal.id, Number(amount), offRampId as string, chainId)
            } catch (error) {
              console.error(
                `Error handling withdrawal event on chain ${chainId}:`,
                error
              );
            }
          }
        },
      });

      // Watch for BridgeFrom events on this chain
      const unsubscribeBridgeFrom = client.watchContractEvent({
        address: getContractAddress(chainId),
        abi: contractABI,
        eventName: "BridgeEntry",
        onLogs: async (logs) => {
          for (const log of logs) {
            const { args } = log;
            if (!args) continue;

            const { user, amount, destinationChainId, bridgeId } = args;

            if (!user || !amount || !destinationChainId || !bridgeId) {
              console.error(
                `Invalid bridge event arguments on chain ${chainId}`
              );
              continue;
            }

            try {
              // Insert bridge record
              const { data: bridge, error } = await supabaseAdmin
                .from("bridges")
                .insert({
                  id: bridgeId,
                  user_address: user,
                  amount: Number(amount),
                  source_chain_id: chainId,
                  destination_chain_id: Number(destinationChainId),
                  status: "pending",
                })
                .select()
                .single();

              if (error) {
                throw error;
              }

              // Process the bridge
              await processBridgeFrom(
                bridge.id,
                user,
                BigInt(amount),
                chainId,
                Number(destinationChainId)
              );
            } catch (error) {
              console.error(
                `Error handling bridge event on chain ${chainId}:`,
                error
              );
            }
          }
        },
      });

      // Watch for BridgeTo events for tracking purposes
      const unsubscribeBridgeTo = client.watchContractEvent({
        address: getContractAddress(chainId),
        abi: contractABI,
        eventName: "BridgeExit",
        onLogs: async (logs) => {
          for (const log of logs) {
            const { args } = log;
            if (!args) continue;

            const { to, amount, sourceChainId, bridgeId } = args;

            try {
              // Update bridge record with completion on destination chain
              await supabaseAdmin
                .from("bridges")
                .update({
                  completed_on_destination: true,
                  destination_chain_tx_hash: log.transactionHash,
                })
                .eq("id", bridgeId);

              console.log(
                `Bridge ${bridgeId} completed on destination chain ${chainId}`
              );
            } catch (error) {
              console.error(
                `Error handling BridgeTo event on chain ${chainId}:`,
                error
              );
            }
          }
        },
      });

      return () => {
        unsubscribeWithdrawal();
        unsubscribeBridgeFrom();
        unsubscribeBridgeTo();
      };
    }
  );

  // Return a function that unsubscribes all listeners
  return async () => {
    for (const unsubscribe of unsubscribers) {
      (await unsubscribe)();
    }
  };
}
