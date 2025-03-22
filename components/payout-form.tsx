"use client";

import {
	ArrowDownIcon,
	ArrowRightLeftIcon,
  SendIcon,
  BuildingIcon,
  UserIcon,
  GlobeIcon,
  BanknoteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function PayoutForm() {
  const [recipientName, setRecipientName] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Handle form submission logic here
  };

  const blockchains = [
    { id: "ethereum", name: "Ethereum" },
    { id: "polygon", name: "Polygon" },
    { id: "avalanche", name: "Avalanche" },
    { id: "base", name: "Base" },
    { id: "optimism", name: "Optimism" },
    { id: "arbitrum", name: "Arbitrum" },
    { id: "bnb", name: "BNB Chain" },
    { id: "gnosis", name: "Gnosis Chain" },
    { id: "fantom", name: "Fantom" },
    { id: "moonbeam", name: "Moonbeam" },
    { id: "moonriver", name: "Moonriver" },
  ]

  const currencySymbols = {
    ETH: "ETH",
    USDC: "USDC",
    USDT: "USDT",
  };

	return (
    <form onSubmit={handleFormSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Label htmlFor="method">Payment Method</Label>
          <Select value={payoutMethod} onValueChange={setPayoutMethod} required>
            <SelectTrigger id="method">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank">Bank Transfer</SelectItem>
              <SelectItem value="wire">Wire Transfer</SelectItem>
              <SelectItem value="ach">ACH</SelectItem>
            </SelectContent>
          </Select>
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
    </form>
	);
}
