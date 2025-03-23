"use client";

import { SendIcon, UserIcon, BanknoteIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Alert } from "./ui/alert";
import { AlertDescription } from "./ui/alert";
import { getSupportedBanksAPI, verifyBankAccountAPI } from "@/lib/api";


export default function PayoutForm() {
  const [recipientName, setRecipientName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false)
  const [payoutReference, setPayoutReference] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const supportedBanks = await getSupportedBanksAPI()
        // remove duplicate banks
        const uniqueBanks = supportedBanks.filter((bank, index, self) =>
          index === self.findIndex((t) => t.code === bank.code)
        )
        setBanks(uniqueBanks)
      } catch (err) {
        setError("Failed to load supported banks")
      } finally {
        setIsLoadingBanks(false)
      }
    }

    loadBanks()
  }, [])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Handle form submission logic here
  };

  // Handle account number verification
  const handleVerifyAccount = async () => {
    if (!recipientAccount || !bankCode) {
      setError("Please enter account number and select bank")
      return
    }

    setError(null)
    setIsVerifying(true)

    try {
      const result = await verifyBankAccountAPI(recipientAccount, bankCode)

      if (result.status) {
        setRecipientName(result.data.accountName)
        setSuccess("Bank account verified successfully!")
      } else {
        throw new Error("Invalid bank account")
      }
    } catch (err) {
      setError((err as { message: string }).message || "Failed to verify bank account")
    } finally {
      setIsVerifying(false)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (recipientAccount && bankCode) {
      handleVerifyAccount()
    }
  }, [recipientAccount, bankCode])

  // Handle bank selection
  const handleBankSelection = (bankCode: string) => {
    const selectedBank = banks.find((bank) => bank.code === bankCode)
    if (selectedBank) {
      setBankCode(bankCode)
      setBankName(selectedBank.name)
    }
  }

  const currencySymbols = {
    ETH: "ETH",
    USDC: "USDC",
    USDT: "USDT",
  };

	return (
    <form onSubmit={handleFormSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-2.5 top-2.5 text-muted-foreground">
              {currencySymbols[payoutAmount as keyof typeof currencySymbols] || payoutAmount}
            </span>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              className="pl-7"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              min="0.01"
              step="0.01"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipient-account">Recipient Account</Label>
          <div className="relative">
            <BanknoteIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="recipient-account"
              placeholder="Enter account number"
              className="pl-8"
              value={recipientAccount}
              onChange={(e) => setRecipientAccount(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank">Bank Name</Label>
          <Select
            value={bankCode}
            onValueChange={handleBankSelection}
            disabled={isLoading || isLoadingBanks}
          >
            <SelectTrigger id="bank">
              <SelectValue placeholder="Select your bank" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((bank) => (
                <SelectItem key={`${bank.code}-${bank.name}-${Math.random()}`} value={bank.code}>
                  {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipient-name">Recipient Name</Label>
          <div className="relative">
            <UserIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="recipient-name"
              placeholder="Enter recipient name"
              className="pl-8"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              required
            />
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <>
              <SendIcon className="mr-2 h-4 w-4" />
              Send Payout
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
	);
}
