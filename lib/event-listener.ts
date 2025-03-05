import { publicClient, getContractAddress, contractABI, getPublicClient } from "./blockchain"
import { supabaseAdmin } from "./supabase"
import { sendNGNToBank } from "./bank-transfer"
import { sendCNGNOnDestinationChain } from "./cross-chain"
import { chainConfigs } from "./constants"

async function processWithdrawal(withdrawalId: string, amount: number, offrampId: string, chainId = 1) {
  try {
    // Update status to processing
    await supabaseAdmin.from("withdrawals").update({ status: "processing" }).eq("id", withdrawalId)

    // Get bank details from offramps table
    const { data: offramp, error: offrampError } = await supabaseAdmin
      .from("offramps")
      .select("bank_account")
      .eq("offramp_id", offrampId)
      .single()

    if (offrampError || !offramp) {
      throw new Error("Failed to get offramp details")
    }

    // Parse bank details (stored as JSON string)
    const bankDetails = JSON.parse(offramp.bank_account)

    // Send NGN to bank account
    const result = await sendNGNToBank(amount, bankDetails)

    // Update withdrawal status to completed
    await supabaseAdmin
      .from("withdrawals")
      .update({
        status: "completed",
        bank_transfer_reference: result.reference,
        processed: true,
      })
      .eq("id", withdrawalId)

    console.log(`Withdrawal ${withdrawalId} processed successfully`)
  } catch (error) {
    console.error(`Error processing withdrawal ${withdrawalId}:`, error)

    // Update withdrawal status to failed
    await supabaseAdmin
      .from("withdrawals")
      .update({
        status: "failed",
        processed: true,
      })
      .eq("id", withdrawalId)
  }
}

async function processBridgeFrom(
  bridgeId: string,
  userAddress: string,
  amount: bigint,
  sourceChainId: number,
  destinationChainId: number,
) {
  try {
    // Update status to processing
    await supabaseAdmin.from("bridges").update({ status: "processing" }).eq("id", bridgeId)

    // Send cNGN on destination chain
    const result = await sendCNGNOnDestinationChain(destinationChainId, userAddress, amount, sourceChainId, bridgeId)

    // Update bridge status to completed
    await supabaseAdmin
      .from("bridges")
      .update({
        status: "completed",
        destination_tx_hash: result.txHash,
        processed: true,
      })
      .eq("id", bridgeId)

    console.log(`Bridge ${bridgeId} processed successfully`)
  } catch (error) {
    console.error(`Error processing bridge ${bridgeId}:`, error)

    // Update bridge status to failed
    await supabaseAdmin
      .from("bridges")
      .update({
        status: "failed",
        processed: true,
      })
      .eq("id", bridgeId)
  }
}

export async function startEventListeners() {
  // Create event listeners for each supported chain
  const unsubscribers = Object.entries(chainConfigs).map(([chainIdStr, config]) => {
    const chainId = Number(chainIdStr)
    const client = chainId === publicClient.chain.id ? publicClient : getPublicClient(chainId)

    console.log(`Starting event listeners for chain ${chainId} (${config.name})`)

    // Watch for Withdrawal events on this chain
    const unsubscribeWithdrawal = client.watchContractEvent({
      address: getContractAddress(chainId),
      abi: contractABI,
      eventName: "Withdrawal",
      onLogs: async (logs) => {
        for (const log of logs) {
          const { args } = log
          if (!args) continue

          const { user, amount, offRampId } = args

          try {
            // Insert withdrawal record
            const { data: withdrawal, error } = await supabaseAdmin
              .from("withdrawals")
              .insert({
                user_address: user,
                amount: Number(amount),
                offramp_id: offRampId as string,
                chain_id: chainId,
                status: "pending",
              })
              .select()
              .single()

            if (error) {
              throw error
            }

            // Process the withdrawal
            await processWithdrawal(withdrawal.id, Number(amount), offRampId as string, chainId)
          } catch (error) {
            console.error(`Error handling withdrawal event on chain ${chainId}:`, error)
          }
        }
      },
    })

    // Watch for BridgeFrom events on this chain
    const unsubscribeBridgeFrom = client.watchContractEvent({
      address: getContractAddress(chainId),
      abi: contractABI,
      eventName: "BridgeFrom",
      onLogs: async (logs) => {
        for (const log of logs) {
          const { args } = log
          if (!args) continue

          const { user, amount, destinationChainId, bridgeId } = args

          if (!user || !amount || !destinationChainId || !bridgeId) {
            console.error(`Invalid bridge event arguments on chain ${chainId}`)
            continue
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
              .single()

            if (error) {
              throw error
            }

            // Process the bridge
            await processBridgeFrom(bridge.id, user, BigInt(amount), chainId, Number(destinationChainId))
          } catch (error) {
            console.error(`Error handling bridge event on chain ${chainId}:`, error)
          }
        }
      },
    })

    // Watch for BridgeTo events for tracking purposes
    const unsubscribeBridgeTo = client.watchContractEvent({
      address: getContractAddress(chainId),
      abi: contractABI,
      eventName: "BridgeTo",
      onLogs: async (logs) => {
        for (const log of logs) {
          const { args } = log
          if (!args) continue

          const { to, amount, sourceChainId, bridgeId } = args

          try {
            // Update bridge record with completion on destination chain
            await supabaseAdmin
              .from("bridges")
              .update({
                completed_on_destination: true,
                destination_chain_tx_hash: log.transactionHash,
              })
              .eq("id", bridgeId)

            console.log(`Bridge ${bridgeId} completed on destination chain ${chainId}`)
          } catch (error) {
            console.error(`Error handling BridgeTo event on chain ${chainId}:`, error)
          }
        }
      },
    })

    return () => {
      unsubscribeWithdrawal()
      unsubscribeBridgeFrom()
      unsubscribeBridgeTo()
    }
  })

  // Return a function that unsubscribes all listeners
  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe())
  }
}

