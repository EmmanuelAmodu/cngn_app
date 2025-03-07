"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2, Copy } from "lucide-react"
import { Steps, Step } from "@/components/ui/steps"
import { Card, CardContent } from "@/components/ui/card"
import { generateVirtualAccountAPI, confirmDepositAPI, fetchVirtualAccountAPI } from "@/lib/api"
import { chainConfigs } from "@/lib/constants"

interface OnrampFormProps {
  address: string | null
  chainId: number | null
}

interface VirtualAccount {
  accountNumber: string
  bankName: string
  accountName: string
  reference: string
}

interface UserDetails {
  firstName: string
  lastName: string
  email: string
  mobileNumber: string
}

export default function OnrampForm({ address, chainId }: OnrampFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null)
  const [userDetails, setUserDetails] = useState<UserDetails>({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
  })

  useEffect(() => {
    if (address) {
      console.log("Fetching Account")
      setIsLoading(true)
      fetchVirtualAccountAPI(address).then(data => {
        if (data) {
          console.log("VA Account data")
          setVirtualAccount(data)
          setCurrentStep(1)
        }

        setIsLoading(false)
      }).catch(err => {
        setIsLoading(false)
      });
    }
  }, [address])

  // Add this function at the beginning of the OnrampForm component
  const ensureCorrectNetwork = async () => {
    if (!chainId) {
      setError("Please connect your wallet first")
      return false
    }

    if (!window.ethereum) {
      setError("MetaMask is not installed")
      return false
    }

    try {
      const chainIdHex = await window.ethereum.request({
        method: "eth_chainId",
      })
      const currentChainId = Number.parseInt(chainIdHex, 16)

      if (currentChainId !== chainId) {
        setError(`Please switch your wallet to ${chainConfigs[chainId].name} network to continue`)

        // Prompt the user to switch networks
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          })
          return true
        } catch (switchError) {
          console.error("Failed to switch networks:", switchError)
          return false
        }
      }

      return true
    } catch (error) {
      console.error("Error checking network:", error)
      setError("Failed to verify network. Please try again.")
      return false
    }
  }

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUserDetails((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Update the handleGenerateAccount function to check network first
  const handleGenerateAccount = async () => {
    if (!address) {
      setError("Please connect your wallet first")
      return
    }

    // Ensure wallet is on the correct network
    const isCorrectNetwork = await ensureCorrectNetwork()
    if (!isCorrectNetwork) return

    // Validate user details
    if (!userDetails.firstName || !userDetails.lastName || !userDetails.email || !userDetails.mobileNumber) {
      setError("Please fill in all required fields")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userDetails.email)) {
      setError("Please enter a valid email address")
      return
    }

    // Validate mobile number (basic validation)
    if (!/^\d{10,15}$/.test(userDetails.mobileNumber.replace(/[^0-9]/g, ""))) {
      setError("Please enter a valid mobile number")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      console.log("Generating virtual account with details:", {
        userAddress: address,
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        email: userDetails.email,
        mobileNumber: "REDACTED",
        chainId: chainId,
      })

      const account = await generateVirtualAccountAPI({
        userAddress: address,
        ...userDetails,
        chainId: chainId || 1,
      })

      if (!account.status || !account.data) {
        throw new Error(account.message || "Failed to generate virtual account")
      }

      setVirtualAccount(account.data)
      console.log(account)
      setCurrentStep(1)
      setSuccess("Virtual account generated successfully!")
    } catch (err) {
      console.error("Virtual account generation error:", err)
      setError((err as { message: string }).message || "Failed to generate virtual account. Please try again.")
      setCurrentStep(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleConfirmDeposit function to check network first
  const handleConfirmDeposit = async () => {
    if (!virtualAccount) {
      setError("No virtual account found")
      return
    }

    // Ensure wallet is on the correct network
    const isCorrectNetwork = await ensureCorrectNetwork()
    if (!isCorrectNetwork) return

    setError(null)
    setIsLoading(true)

    try {
      await confirmDepositAPI(virtualAccount.reference, "10", chainId || 1)
      setCurrentStep(2)
      setSuccess("Deposit confirmed! Your tokens will be minted shortly.")
    } catch (err) {
      setError((err as { message: string }).message || "Failed to confirm deposit. Please ensure you have made the transfer and try again.")
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
        <Step title="Enter Details" description="Amount and personal information" completed={currentStep >= 0} />
        <Step title="Get Account" description="Receive virtual account details" completed={currentStep >= 1} />
        <Step title="Make Payment" description="Transfer funds" completed={currentStep >= 2} />
      </Steps>

      <div className="space-y-6">
        {currentStep === 0 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Enter your first name"
                  value={userDetails.firstName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Enter your last name"
                  value={userDetails.lastName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={userDetails.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Input
                  id="mobileNumber"
                  name="mobileNumber"
                  placeholder="Enter your mobile number"
                  value={userDetails.mobileNumber}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <Button onClick={handleGenerateAccount} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Virtual Account
              </Button>
            </CardContent>
          </Card>
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
                    Please transfer above 5,000 NGN to the virtual account above. Once you've made the transfer, click the
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
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Your transfer has been confirmed! Your tokens will be minted and sent to your wallet shortly.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && !error && currentStep < 2 && (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
