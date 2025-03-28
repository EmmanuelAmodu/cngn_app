"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { approveTokens, offRampToken } from "@/lib/contract"
import { getSupportedBanksAPI, verifyBankAccountAPI, initiateOfframpAPI } from "@/lib/api"
import { Steps, Step } from "@/components/ui/steps"
import type { Hex } from "viem"

interface OfframpFormProps {
  address: string | undefined
  chainId: number | undefined
}

interface BankDetails {
  accountNumber: string
  accountName: string
  bankName: string
  bankCode: string
}

export default function OfframpForm({ address, chainId }: OfframpFormProps) {
  const [amount, setAmount] = useState("")
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([])
  const [isLoadingBanks, setIsLoadingBanks] = useState(true)
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountNumber: "",
    accountName: "",
    bankName: "",
    bankCode: "",
  })
  const [isVerifying, setIsVerifying] = useState(false)
  const [offrampReference, setOfframpReference] = useState<string | null>(null)

  // Load supported banks
  useEffect(() => {
    const loadBanks = async () => {
      try {
        const supportedBanks = await getSupportedBanksAPI()
        setBanks(supportedBanks)
      } catch (err) {
        setError("Failed to load supported banks")
      } finally {
        setIsLoadingBanks(false)
      }
    }

    loadBanks()
  }, [])

  // Handle bank selection
  const handleBankSelection = (bankCode: string) => {
    const selectedBank = banks.find((bank) => bank.code === bankCode)
    if (selectedBank) {
      setBankDetails((prev) => ({
        ...prev,
        bankCode,
        bankName: selectedBank.name,
      }))
    }
  }

  // Handle account number verification
  const handleVerifyAccount = async () => {
    if (!bankDetails.accountNumber || !bankDetails.bankCode) {
      setError("Please enter account number and select bank")
      return
    }

    setError(null)
    setIsVerifying(true)

    try {
      const result = await verifyBankAccountAPI(bankDetails.accountNumber, bankDetails.bankCode)

      if (result.status) {
        setBankDetails((prev) => ({
          ...prev,
          accountName: result.data.accountName,
        }))
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

  // Handle bank details submission
  const handleBankDetailsSubmit = async () => {
    if (!bankDetails.accountNumber || !bankDetails.accountName || !bankDetails.bankName) {
      setError("Please fill in all bank details")
      return
    }

    if (!amount || Number.isNaN(Number.parseFloat(amount)) || Number.parseFloat(amount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    setError(null)
    setCurrentStep(1)
    setSuccess("Bank details saved successfully!")
  }

  // Update the handleApprove function to check network first
  const handleApprove = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const hash = await approveTokens(amount, chainId)
      setTxHash(hash)
      setCurrentStep(2)
      setSuccess("Token spend approved successfully!")
    } catch (err) {
      setError((err as { message: string }).message || "Failed to approve tokens")
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleBurn function to check network first
  const handleOffRamp = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // First initiate the offramp process
      const offrampResult = await initiateOfframpAPI(amount, bankDetails, chainId)
      setOfframpReference(offrampResult.data.reference)

      if (!offrampResult.status) {
        throw new Error("Failed to initiate offramp")
      }

      if (!chainId) {
        throw new Error("Chain ID not found")
      }

      // Then call the off ramp function
      const hash = await offRampToken(amount, chainId,  offrampResult.data.reference as Hex)
      setTxHash(hash)

      setCurrentStep(3)
      setSuccess(
        `Tokens burned successfully! You will receive ${amount} NGN in your bank account within ${new Date(offrampResult.data.estimatedTime).getMinutes()} minutes.`,
      )
    } catch (err) {
      setError((err as { message: string }).message || "Failed to burn tokens")
    } finally {
      setIsLoading(false)
    }
  }

  if (!address) {
    return (
      <Alert className="mt-4 bg-amber-50 text-amber-800 border-amber-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please connect your wallet to begin offramping</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 py-4">
      <Steps currentStep={currentStep} className="mb-8">
        <Step title="Enter Details" description="Amount and bank information" completed={currentStep >= 0} />
        <Step title="Approve Tokens" description="Approve token spending" completed={currentStep >= 1} />
        <Step title="Burn Tokens" description="Convert to fiat" completed={currentStep >= 2} />
        <Step title="Complete" description="View transaction details" completed={currentStep >= 3} />
      </Steps>
      <Card>
        <CardContent className="pt-6 space-y-4">
          {currentStep === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to Withdraw (cNGN)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank">Bank Name</Label>
                <Select
                  value={bankDetails.bankCode}
                  onValueChange={handleBankSelection}
                  disabled={isLoading || isLoadingBanks}
                >
                  <SelectTrigger id="bank">
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="accountNumber"
                    type="text"
                    placeholder="Enter your account number"
                    value={bankDetails.accountNumber}
                    onChange={(e) =>
                      setBankDetails((prev) => ({
                        ...prev,
                        accountNumber: e.target.value,
                      }))
                    }
                    disabled={isLoading || isVerifying}
                  />
                  <Button
                    onClick={handleVerifyAccount}
                    disabled={isVerifying || !bankDetails.accountNumber || !bankDetails.bankCode}
                    variant="outline"
                  >
                    {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                  </Button>
                </div>
              </div>

              {bankDetails.accountName && (
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <div className="p-2 bg-muted rounded-md">{bankDetails.accountName}</div>
                </div>
              )}

              <Button
                onClick={handleBankDetailsSubmit}
                disabled={isLoading || !bankDetails.accountName}
                className="w-full"
              >
                Continue
              </Button>
            </>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertDescription>
                  Please approve the contract to spend your cNGN tokens. This is required for the offramp process.
                </AlertDescription>
              </Alert>

              <Button onClick={handleApprove} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve Token Spending
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertDescription>
                  Click below to burn your cNGN tokens and receive {amount} NGN in your bank account.
                </AlertDescription>
              </Alert>

              <Button onClick={handleOffRamp} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Burn Tokens
              </Button>
            </div>
          )}

          {currentStep === 3 && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>Your tokens have been burned successfully! The funds will be sent to:</p>
                  <div className="pl-4 border-l-2 border-green-200 mt-2">
                    <p>
                      <strong>Bank:</strong> {bankDetails.bankName}
                    </p>
                    <p>
                      <strong>Account:</strong> {bankDetails.accountNumber}
                    </p>
                    <p>
                      <strong>Name:</strong> {bankDetails.accountName}
                    </p>
                  </div>
                  {txHash && (
                    <a
                      href={`https://etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:underline gap-1 mt-2"
                    >
                      View transaction <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {offrampReference && <p className="text-sm mt-2">Reference number: {offrampReference}</p>}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

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
  )
}

