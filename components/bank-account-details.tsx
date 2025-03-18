"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Copy, Loader2, CreditCardIcon } from "lucide-react"
import { fetchVirtualAccountAPI } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type Address, erc20Abi } from "viem"
import { getPublicClient } from "@/lib/blockchain"
import { chainConfigs } from "@/lib/constants"
import { Skeleton } from "@/components/ui/skeleton"

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  BTC: "₿",
  ETH: "Ξ",
}

interface AccountDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
  accountType: string;
  routingNumber: string;
  balances: Record<string, number>;
  reference?: string;
}

interface BankAccountDetailsProps {
  userAddress: Address;
  chainId: number;
}

export default function BankAccountDetails({ 
  userAddress,
  chainId
}: BankAccountDetailsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (!userAddress) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchVirtualAccountAPI(userAddress?.toLowerCase());
        if (response?.data) {
          setAccountDetails(response.data);
        } else {
          throw new Error("Failed to fetch account details");
        }
      } catch (err) {
        console.error("Error fetching account details:", err);
        setError(
          (err as { message: string }).message ||
            "Failed to fetch account details. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountDetails();
  }, [userAddress]);

  const getBalance = useCallback(async (chainId: number, address: Address, tokenAddress: Address) => {
    const publicClient = getPublicClient(chainId);
    const decimals = await publicClient.readContract({
      address: chainConfigs[chainId].tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "decimals",
    });
  
    const balance = await publicClient.readContract({
      address: chainConfigs[chainId].tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    });

    setBalance(Number(balance) / (10 ** Number(decimals)));
  }, []);

  useEffect(() => {
    if (!chainId || !userAddress) return;
    getBalance(chainId, userAddress, chainConfigs[chainId].tokenAddress as Address);
  }, [chainId, userAddress, getBalance]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
              <CreditCardIcon className="h-5 w-5 text-primary" />
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : accountDetails ? (
              <div>
                <p className="text-sm text-muted-foreground">{accountDetails.accountType}</p>
                <p className="text-lg font-bold">{accountDetails.accountName}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{accountDetails.accountNumber}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(accountDetails.accountNumber, "accountNumber")
                    }
                  >
                    {copiedField === "accountNumber" ? "Copied!" : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-sm">
            {isLoading ? (
              <>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </>
            ) : accountDetails ? (
              <>
                <div>
                  <p className="text-muted-foreground">Bank</p>
                  <p className="font-medium">{accountDetails.bankName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Routing</p>
                  <p className="font-medium">{accountDetails.routingNumber}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">Balance</p>
                    <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                      <SelectTrigger className="h-6 w-20 text-xs">
                        <SelectValue placeholder="USD" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(accountDetails.balances).map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="font-medium text-primary">
                    {currencySymbols[selectedCurrency] || ""}
                    {balance}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
