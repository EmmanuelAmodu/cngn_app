"use client"

import type React from "react"

import { useState } from "react"
import {
  BuildingIcon as BridgeIcon,
  GlobeIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Currency symbols
const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  BTC: "₿",
  ETH: "Ξ",
}

// Blockchain networks
const blockchains = [
  { id: "ethereum", name: "Ethereum" },
  { id: "bsc", name: "Binance Smart Chain" },
  { id: "polygon", name: "Polygon" },
  { id: "avalanche", name: "Avalanche" },
  { id: "solana", name: "Solana" },
  { id: "arbitrum", name: "Arbitrum" },
]

export default function BridgeFormV2() {
  const [selectedCurrency, setSelectedCurrency] = useState("USD")

  // Bridge form state
  const [sourceChain, setSourceChain] = useState("")
  const [destinationChain, setDestinationChain] = useState("")
  const [bridgeAmount, setBridgeAmount] = useState("")
  const [destinationAddress, setDestinationAddress] = useState("")


  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      // Reset form based on active tab
      setSourceChain("")
      setDestinationChain("")
      setBridgeAmount("")
      setDestinationAddress("")
      setIsSubmitting(false)
    }, 1500)
  }

  return (
    <form onSubmit={handleFormSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source-chain">Source Chain</Label>
          <Select value={sourceChain} onValueChange={setSourceChain} required>
            <SelectTrigger id="source-chain">
              <SelectValue placeholder="Select source chain" />
            </SelectTrigger>
            <SelectContent>
              {blockchains.map((chain) => (
                <SelectItem key={chain.id} value={chain.id}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination-chain">Destination Chain</Label>
          <Select value={destinationChain} onValueChange={setDestinationChain} required>
            <SelectTrigger id="destination-chain">
              <SelectValue placeholder="Select destination chain" />
            </SelectTrigger>
            <SelectContent>
              {blockchains.map((chain) => (
                <SelectItem key={chain.id} value={chain.id}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bridge-amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-2.5 top-2.5 text-muted-foreground">
              {currencySymbols[selectedCurrency] || selectedCurrency}
            </span>
            <Input
              id="bridge-amount"
              type="number"
              placeholder="0.00"
              className="pl-7"
              value={bridgeAmount}
              onChange={(e) => setBridgeAmount(e.target.value)}
              min="0.01"
              step="0.01"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination-address">Destination Address</Label>
          <div className="relative">
            <GlobeIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="destination-address"
              placeholder="0x..."
              className="pl-8"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
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
              <BridgeIcon className="mr-2 h-4 w-4" />
              Bridge Assets
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
