import { useState, useEffect, useCallback } from "react";

export interface Transaction {
  id: string;
  type: 'onramp' | 'offramp' | 'bridge';
  amount: number;
  chainId: number | null;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userAddress: string;
  onChainTx: string | null;
  destinationTxHash: string | null;
  paymentReference: string | null;
  bankTransferReference: string | null;
}

interface UseTransactionsProps {
  userAddress?: string;
  type?: 'onramp' | 'offramp' | 'bridge';
}

export function useTransactions({ userAddress, type }: UseTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!userAddress) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('userAddress', userAddress.toLowerCase());
      if (type) params.append('type', type);

      const response = await fetch(`/api/transactions?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      setTransactions(data.data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, type]);

  useEffect(() => {
    fetchTransactions();

    // Set up polling every 30 seconds
    const intervalId = setInterval(fetchTransactions, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [fetchTransactions]);

  return { transactions, isLoading, error };
} 