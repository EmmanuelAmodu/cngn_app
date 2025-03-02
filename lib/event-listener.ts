import { publicClient, CONTRACT_ADDRESS, contractABI } from "./blockchain"
import { supabaseAdmin } from "./supabase"
import { sendNGNToBank } from "./bank-transfer"
import { sendCNGNOnDestinationChain } from "./cross-chain"

async function processWithdrawal(withdrawalId: string, amount: number, offrampId: string) {
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

async function processBridge(bridgeId: string, userAddress: string, amount: bigint, destinationChainId: number) {
  try {
    // Update status to processing
    await supabaseAdmin.from("bridges").update({ status: "processing" }).eq("id", bridgeId)

    // Send cNGN on destination chain
    const result = await sendCNGNOnDestinationChain(destinationChainId, userAddress, amount)

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
  // Watch for Withdrawal events
  const unsubscribeWithdrawal = publicClient.watchContractEvent({
    address: CONTRACT_ADDRESS,
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
              status: "pending",
            })
            .select()
            .single()

          if (error) {
            throw error
          }

          // Process the withdrawal
          await processWithdrawal(withdrawal.id, Number(amount), offRampId as string)
        } catch (error) {
          console.error("Error handling withdrawal event:", error)
        }
      }
    },
  })

  // Watch for Bridge events
  const unsubscribeBridge = publicClient.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    eventName: "Bridge",
    onLogs: async (logs) => {
      for (const log of logs) {
        const { args } = log
        if (!args) continue

        const { user, amount, destinationChainId } = args

        if (!user || !amount || !destinationChainId) {
          console.error("Invalid bridge event arguments")
          continue
        }

        try {
          // Insert bridge record
          const { data: bridge, error } = await supabaseAdmin
            .from("bridges")
            .insert({
              user_address: user,
              amount: Number(amount),
              destination_chain_id: Number(destinationChainId),
              status: "pending",
            })
            .select()
            .single()

          if (error) {
            throw error
          }

          // Process the bridge
          await processBridge(bridge.id, user, BigInt(amount), Number(destinationChainId))
        } catch (error) {
          console.error("Error handling bridge event:", error)
        }
      }
    },
  })

  return () => {
    unsubscribeWithdrawal()
    unsubscribeBridge()
  }
}

