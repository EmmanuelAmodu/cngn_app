"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ArrowRightLeftIcon, ArrowUpDownIcon as ArrowsUpDownIcon } from "lucide-react"
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

  // Set max amount for swap
  const handleSetMaxAmount = () => {
    if (fromCurrency) {
      const maxAmount = accountInfo.balances[fromCurrency as keyof typeof accountInfo.balances]
      setSwapAmount(maxAmount.toString())
    }
  }

  // Swap currencies
  const handleSwapCurrencies = () => {
    if (fromCurrency && toCurrency) {
      // Store current values
      const tempFromCurrency = fromCurrency
      const tempToCurrency = toCurrency
      const tempEstimatedReceive = estimatedReceive

      // Swap currencies
      setFromCurrency(tempToCurrency)
      setToCurrency(tempFromCurrency)

      // Swap amounts (estimated becomes input, input becomes empty)
      setSwapAmount(tempEstimatedReceive)
    }
  }

  return (
    <form onSubmit={handleFormSubmit}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="from-currency" className="text-sm mb-1.5 block">
            From
          </Label>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <Select value={fromCurrency} onValueChange={setFromCurrency} required>
              <SelectTrigger id="from-currency">
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
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-muted-foreground">
                {fromCurrency ? currencySymbols[fromCurrency] || "" : ""}
              </span>
              <Input
                id="swap-amount"
                type="number"
                placeholder="0.00"
                className={fromCurrency ? "pl-7 pr-16" : "pr-16"}
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                min="0.01"
                step="0.01"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-2 text-xs font-medium text-primary hover:text-primary/80"
                onClick={handleSetMaxAmount}
                disabled={!fromCurrency}
              >
                MAX
              </Button>
            </div>
          </div>
          {fromCurrency && (
            <p className="text-xs text-muted-foreground mt-1">
              Available: {currencySymbols[fromCurrency] || ""}
              {accountInfo.balances[fromCurrency as keyof typeof accountInfo.balances].toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center">
          <div className="h-px bg-border flex-grow" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mx-2 h-8 w-8 rounded-full"
            onClick={handleSwapCurrencies}
            disabled={!fromCurrency || !toCurrency}
          >
            <ArrowsUpDownIcon className="h-4 w-4" />
            <span className="sr-only">Swap currencies</span>
          </Button>
          <div className="h-px bg-border flex-grow" />
        </div>

        <div>
          <Label htmlFor="to-currency" className="text-sm mb-1.5 block">
            To
          </Label>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <Select value={toCurrency} onValueChange={setToCurrency} required>
              <SelectTrigger id="to-currency">
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
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-muted-foreground">
                {toCurrency ? currencySymbols[toCurrency] || "" : ""}
              </span>
              <Input
                id="estimated-receive"
                value={estimatedReceive}
                className={toCurrency ? "pl-7 bg-muted/20" : "bg-muted/20"}
                readOnly
              />
            </div>
          </div>
          {fromCurrency && toCurrency && swapAmount && (
            <div className="flex justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Rate: 1 {fromCurrency} ≈{" "}
                {(Number.parseFloat(estimatedReceive) / Number.parseFloat(swapAmount)).toFixed(4)}{" "}
                {toCurrency}
              </p>
              <p className="text-xs text-muted-foreground">Fee: 0.1%</p>
            </div>
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
