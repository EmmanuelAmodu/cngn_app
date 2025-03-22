"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ArrowRightLeftIcon, ArrowDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Account information with multiple currencies
const accountInfo = {
  accountNumber: "1234567890",
  accountName: "John Doe",
  accountType: "Checking Account",
  bankName: "Example Bank",
  routingNumber: "987654321",
  balances: {
    USD: 5432.1,
    EUR: 4850.75,
    GBP: 4125.3,
    JPY: 750000.0,
    BTC: 0.12,
    ETH: 2.5,
  },
}

// Currency symbols
const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  BTC: "₿",
  ETH: "Ξ",
}

export default function SwapForm() {
  // Swap form state
  const [fromCurrency, setFromCurrency] = useState("")
  const [toCurrency, setToCurrency] = useState("")
  const [swapAmount, setSwapAmount] = useState("")
  const [estimatedReceive, setEstimatedReceive] = useState("0.00")

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate estimated receive amount when swap inputs change
  useEffect(() => {
    if (fromCurrency && toCurrency && swapAmount) {
      // Mock exchange rate calculation - in a real app, you'd fetch this from an API
      const mockRates: Record<string, Record<string, number>> = {
        USD: { EUR: 0.92, GBP: 0.78, JPY: 150.25, BTC: 0.000022, ETH: 0.00035 },
        EUR: { USD: 1.09, GBP: 0.85, JPY: 163.12, BTC: 0.000024, ETH: 0.00038 },
        GBP: { USD: 1.28, EUR: 1.18, JPY: 192.45, BTC: 0.000028, ETH: 0.00045 },
        JPY: { USD: 0.0067, EUR: 0.0061, GBP: 0.0052, BTC: 0.00000015, ETH: 0.0000024 },
        BTC: { USD: 45000, EUR: 41400, GBP: 35100, JPY: 6750000, ETH: 16 },
        ETH: { USD: 2800, EUR: 2576, GBP: 2184, JPY: 420700, BTC: 0.0625 },
      }

      const rate = mockRates[fromCurrency]?.[toCurrency] || 1
      const estimated = Number.parseFloat(swapAmount) * rate
      setEstimatedReceive(estimated.toFixed(toCurrency === "JPY" ? 0 : 2))
    } else {
      setEstimatedReceive("0.00")
    }
  }, [fromCurrency, toCurrency, swapAmount])

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setFromCurrency("")
      setToCurrency("")
      setSwapAmount("")
      setEstimatedReceive("0.00")
      setIsSubmitting(false)

    }, 1500)
  }

  return (
    <form onSubmit={handleFormSubmit}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="from-currency">From</Label>
          <div className="flex gap-2">
            <Select value={fromCurrency} onValueChange={setFromCurrency} required>
              <SelectTrigger id="from-currency" className="w-32">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(accountInfo.balances).map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-2.5 text-muted-foreground">
                {fromCurrency ? currencySymbols[fromCurrency] || "" : ""}
              </span>
              <Input
                id="swap-amount"
                type="number"
                placeholder="0.00"
                className={fromCurrency ? "pl-7" : ""}
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>
          {fromCurrency && (
            <p className="text-xs text-muted-foreground">
              Available: {currencySymbols[fromCurrency] || ""}
              {accountInfo.balances[fromCurrency as keyof typeof accountInfo.balances].toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <div className="bg-muted dark:bg-muted/30 rounded-full p-2">
            <ArrowDownIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to-currency">To</Label>
          <div className="flex gap-2">
            <Select value={toCurrency} onValueChange={setToCurrency} required>
              <SelectTrigger id="to-currency" className="w-32">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(accountInfo.balances).map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-2.5 text-muted-foreground">
                {toCurrency ? currencySymbols[toCurrency] || "" : ""}
              </span>
              <Input
                id="estimated-receive"
                value={estimatedReceive}
                className={toCurrency ? "pl-7" : ""}
                readOnly
              />
            </div>
          </div>
          {fromCurrency && toCurrency && swapAmount && (
            <p className="text-xs text-muted-foreground">
              Rate: 1 {fromCurrency} ≈{" "}
              {(Number.parseFloat(estimatedReceive) / Number.parseFloat(swapAmount)).toFixed(4)} {toCurrency}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={isSubmitting || !fromCurrency || !toCurrency || !swapAmount}>
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <>
              <ArrowRightLeftIcon className="mr-2 h-4 w-4" />
              Swap Currencies
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

