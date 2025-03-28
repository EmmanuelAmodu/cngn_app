import { erc20Abi, type TransactionReceipt, type Address, type Hex } from "viem";
import { DEX_ABI } from "./abi/dex-abi";
import { getPublicClient, getWalletClient, getContractAddress, getTokenAddress, getChain } from "./blockchain";
import { getCustomerTransactions } from "./paystack-client";
import Bull from "bull";
import { prisma } from "./database";
import { randomBytes } from "crypto";
import { chainConfigs } from "./constants";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error("Redis URL not defined");
}

const onrampQueue = new Bull("onramp_queue", {
  redis: REDIS_URL,
});

export async function onRampPolling() {
  onrampQueue.process(async (job) => {
    const { transactionId } = job.data;
    await processOnRamp(transactionId, 8453);
  });

  while (true) {
    console.log("Polling for pending onramps");
    // First, check for new Paystack transactions for all virtual accounts
    await syncPaystackTransactions();

    // Then process pending transactions
    const pendingTransactions = await prisma.onramp.findMany({
      where: { 
        status: 'pending',
      },
      take: 100
    });

    if (!pendingTransactions || pendingTransactions.length === 0) {
      console.log("No pending onramps found");
      await new Promise((resolve) => setTimeout(resolve, 10000));
      continue;
    }

    for (const transaction of pendingTransactions) {
      try {
        await onrampQueue.add(
          { 
            onrampId: transaction.onrampId,
            chainId: transaction.chainId
          },
          { delay: 5000 }
        );

        await prisma.onramp.update({
          where: { onrampId: transaction.onrampId },
          data: { status: "queued" }
        });
      } catch (error) {
        console.error(`Error queueing onramp ${transaction.onrampId}:`, error);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
}

async function syncPaystackTransactions() {
  try {
    const transactions = await getCustomerTransactions();
    console.log("Transactions count", transactions.length);

    for (const transaction of transactions) {
      const { status, amount, id, customer } = transaction;
      if (status !== "success") continue;

      const virtualAccount = await prisma.virtualAccount.findFirst({
        where: {
          reference: customer.id.toString()
        }
      })

      if (!virtualAccount) continue;
      
      // Check if we've already processed this transaction
      const existingTransaction = await prisma.onramp.findFirst({
        where: { paymentReference: id.toString() }
      });

      if (existingTransaction) continue;

      // Create new transaction record
      await prisma.onramp.create({
        data: {
          onrampId: `0x${randomBytes(32).toString("hex")}`,
          paymentReference: id.toString(),
          userAddress: virtualAccount.userAddress,
          amount: amount / 100, // Convert from kobo to naira
          chainId: 8453,
          status: 'pending'
        }
      });
    }
  } catch (error) {
    console.error("Error syncing Paystack transactions", error);
  }
}

async function processOnRamp(transactionId: string, chainId: number) {
  console.log("Processing onramp", transactionId);

  const transaction = await prisma.onramp.findFirst({
    where: {
      onrampId: transactionId,
      status: 'queued',
    }
  });

  console.log("Processing Queued onramp", transaction);
  if (!transaction) {
    throw new Error("Transaction not found or already processed");
  }

  await prisma.onramp.update({
    where: { onrampId: transactionId },
    data: { status: "processing" }
  });

  const { amount, userAddress, onrampId } = transaction;

  // Commit transaction on-chain
  const publicClient = getPublicClient(chainId);
  const walletClient = getWalletClient(chainId);
  const contractAddress = getContractAddress(chainId);

  try {
    if (!walletClient.account) {
      throw new Error("Wallet client account not initialized");
    }

    // Get token decimals
    const decimals = await publicClient.readContract({
      address: getTokenAddress(chainId),
      functionName: 'decimals',
      abi: erc20Abi
    });

    // Convert amount to wei (minus fees)
    const amountMinusFees = amount - 50; // 50 naira fee
    const amountInWei = BigInt(amountMinusFees * 10 ** decimals);

    if (amountInWei <= 0) {
      throw new Error("Invalid amount after fees");
    }

    // Check contract balance
    const balance = await publicClient.readContract({
      address: getTokenAddress(chainId),
      functionName: 'balanceOf',
      abi: erc20Abi,
      args: [contractAddress],
    });

    if (balance < amountInWei) {
      throw new Error("Insufficient balance in contract");
    }

    const [
      to,
      amountCon,
      chainIdCon,
      id,
      isAdminAction,
      adminActionType,
      userActionType,
      exists,
      blockNumber,
    ] = await publicClient.readContract({
      address: chainConfigs[chainId].contractAddress as `0x${string}`,
      abi: DEX_ABI,
      functionName: "records",
      args: [onrampId as `0x${string}`],
    });

    if (exists) {
      console.log(`Onramp ${onrampId} already committed`);
      return;
    }

    // Execute onramp transaction
    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: DEX_ABI,
      account: walletClient.account,
      functionName: "onRamp",
      args: [userAddress as Address, amountInWei, transactionId as Hex],
      chain: getChain(chainId),
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    console.log("Receipt", receipt);

    // Update transaction status
    await prisma.onramp.update({
      where: { onrampId: transactionId },
      data: {
        status: "completed",
        onChainTx: txHash,
      }
    });

    console.log(`Onramp ${transactionId} processed successfully`);
  } catch (error) {
    console.error(`Error processing onramp ${transactionId}:`, error);

    await prisma.onramp.update({
      where: { onrampId: transactionId },
      data: { status: "pending" }
    });
  }
} 
