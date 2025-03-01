"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2, Copy, ExternalLink } from "lucide-react"
import { Steps, Step } from "@/components/ui/steps"
import { generateVirtualAccount, confirmDeposit, mintTokens, approveCNGN, depositCNGN } from "@/lib/contract"
import { Card, CardContent } from "@/components/ui/card"

interface OnrampFormProps {
  address: string | null
  chainId: number | null
}

interface VirtualAccount {
  accountNumber: string
  bankName: string
  accountName: string
}

export default function OnrampForm({ address, chainId }: OnrampFormProps) {
  const [amount, setAmount] = useState("")
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null)

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess("Copied to clipboard!")
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError("Failed to copy to clipboard")
    }
  }

  // Update the handleGenerateAccount function to handle API response
  const handleGenerateAccount = async () => {
    if (!address) {
      setError("Please connect your wallet first")
      return
    }

    if (!amount || isNaN(Number.parseFloat(amount)) || Number.parseFloat(amount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      // Clear previous virtual account if any
      setVirtualAccount(null)

      const account = await generateVirtualAccount(amount)

      // Validate the received account details
      if (!account.accountNumber || !account.bankName || !account.accountName) {
        throw new Error("Invalid virtual account details received")
      }

      setVirtualAccount(account)
      setCurrentStep(1)
      setSuccess("Virtual account generated successfully!")
    } catch (err: any) {
      console.error("Virtual account generation error:", err)
      setError(err.message || "Failed to generate virtual account. Please try again.")
      setCurrentStep(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleConfirmDeposit function to handle API response
  const handleConfirmDeposit = async () => {
    if (!virtualAccount) {
      setError("No virtual account found")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      await confirmDeposit(amount)
      setCurrentStep(2)
      setSuccess("Deposit confirmed! Proceeding to mint tokens...")
      // Automatically proceed to minting after deposit confirmation
      handleMint()
    } catch (err: any) {
      setError(err.message || "Failed to confirm deposit. Please ensure you have made the transfer and try again.")
      setIsLoading(false)
    }
  }

  // Step 4: Mint Tokens
  const handleMint = async () => {
    try {
      const hash = await mintTokens(amount)
      setTxHash(hash)
      setCurrentStep(3)
      setSuccess("Tokens minted successfully!")
    } catch (err: any) {
      setError(err.message || "Failed to mint tokens")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const hash = await approveCNGN(amount)
      setTxHash(hash)
      setSuccess("cNGN approved successfully!")
      setCurrentStep(1)
    } catch (err: any) {
      setError(err.message || "Failed to approve cNGN")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeposit = async () => {
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const hash = await depositCNGN(amount)
      setTxHash(hash)
      setSuccess("cNGN deposited successfully!")
      setCurrentStep(2)
    } catch (err: any) {
      setError(err.message || "Failed to deposit cNGN")
    } finally {
      setIsLoading(false)
    }
  }

  if (!address) {
    return (
      <Alert className="mt-4 bg-amber-50 text-amber-800 border-amber-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please connect your wallet to begin onramping</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 py-4">
      <Steps currentStep={currentStep} className="mb-8">
        <Step title="Connect Wallet" description="Connect to MetaMask" completed={currentStep >= 0} />
        <Step title="Generate Account" description="Get virtual account details" completed={currentStep >= 1} />
        <Step title="Deposit Funds" description="Send fiat to virtual account" completed={currentStep >= 2} />
        <Step title="Mint Tokens" description="Receive your tokens" completed={currentStep >= 3} />
      </Steps>

      <div className="space-y-6">
        {currentStep === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (NGN)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount in NGN"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleGenerateAccount} disabled={isLoading || !amount} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Virtual Account
            </Button>
          </div>
        )}

        {currentStep === 1 && virtualAccount && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Bank Name</Label>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{virtualAccount.bankName}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(virtualAccount.bankName)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Account Number</Label>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{virtualAccount.accountNumber}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(virtualAccount.accountNumber)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Account Name</Label>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{virtualAccount.accountName}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(virtualAccount.accountName)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                  <AlertDescription>
                    Please transfer {amount} NGN to the virtual account above. Once you've made the transfer, click the
                    button below.
                  </AlertDescription>
                </Alert>
              </div>

              <Button onClick={handleConfirmDeposit} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}I Have Made The Transfer
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p>Minting your tokens...</p>
          </div>
        )}

        {currentStep === 3 && (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Your tokens have been minted successfully!</p>
                {txHash && (
                  <a
                    href={`https://etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:underline gap-1"
                  >
                    View transaction <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && !error && currentStep < 3 && (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

