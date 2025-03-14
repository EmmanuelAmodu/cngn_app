"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { bridgeCNGN, initiateBridge, checkBridgeStatus } from "@/lib/contract"
import { getSupportedChainsAPI } from "@/lib/api"
import { Steps, Step } from "@/components/ui/steps"
import { chainConfigs } from "@/lib/constants"

interface BridgeFormProps {
  address: string | undefined
  chainId: number | undefined
}

interface Chain {
  id: number
  name: string
  status: "active" | "congested" | "inactive"
}

export default function BridgeForm({ address, chainId }: BridgeFormProps) {
  const [amount, setAmount] = useState("")
  const [destinationChainId, setDestinationChainId] = useState<string>("")
  const [isBridging, setIsBridging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [chains, setChains] = useState<Chain[]>([])
  const [isLoadingChains, setIsLoadingChains] = useState(true)
  const [bridgeReference, setBridgeReference] = useState<string | null>(null)
  const [bridgeStatus, setBridgeStatus] = useState<"pending" | "processing" | "completed" | "failed" | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (amount && destinationChainId) {
      setCurrentStep(1)
    }
  }, [amount, destinationChainId])

  // Load supported chains
  useEffect(() => {
    const loadChains = async () => {
      try {
        const supportedChains = await getSupportedChainsAPI()
        setChains(supportedChains)
      } catch (err) {
        setError("Failed to load supported chains")
      } finally {
        setIsLoadingChains(false)
      }
    }

    loadChains()
  }, [])

  // Check bridge status periodically
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const checkStatus = async () => {
      if (bridgeReference && bridgeStatus !== "completed" && bridgeStatus !== "failed") {
        try {
          const status = await checkBridgeStatus(bridgeReference)
          setBridgeStatus(status.status)

          if (status.status === "completed" || status.status === "failed") {
            clearInterval(intervalId)
          }
        } catch (err) {
          console.error("Error checking bridge status:", err)
        }
      }
    }

    if (bridgeReference) {
      intervalId = setInterval(checkStatus, 5000) // Check every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [bridgeReference, bridgeStatus])

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
        } catch (switchError: any) {
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

  // Update the handleBridge function to pass chainId
  const handleBridge = async () => {
    if (!address) {
      setError("Please connect your wallet first")
      return
    }

    // Ensure wallet is on the correct network
    const isCorrectNetwork = await ensureCorrectNetwork()
    if (!isCorrectNetwork) return

    if (!amount || isNaN(Number.parseFloat(amount)) || Number.parseFloat(amount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (!destinationChainId) {
      setError("Please select a destination chain")
      return
    }

    const selectedChain = chains.find((c) => c.id.toString() === destinationChainId)
    if (selectedChain?.status === "inactive") {
      setError("Selected chain is currently inactive")
      return
    }

    setError(null)
    setSuccess(null)
    setIsBridging(true)
    setBridgeStatus(null)
    setBridgeReference(null)

    try {
      setCurrentStep(2)

      // First initiate the bridge monitoring to get the bridgeId
      const bridgeResult = await initiateBridge(
        amount,
        chainConfigs[chainId || 1].name,
        chainConfigs[Number(destinationChainId)].name,
        chainId || 1,
      )

      // Then call bridgeFrom on the source chain with the bridgeId
      const hash = await bridgeCNGN(amount, Number.parseInt(destinationChainId), chainId || 1)
      setTxHash(hash)

      setBridgeReference(bridgeResult.reference)
      setBridgeStatus("pending")
      setCurrentStep(3)

      setSuccess("Bridge initiated successfully!")
    } catch (err: any) {
      setError(err.message || "Failed to bridge cNGN")
    } finally {
      setIsBridging(false)
    }
  }

  if (!address) {
    return (
      <Alert className="mt-4 bg-amber-50 text-amber-800 border-amber-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please connect your wallet to bridge cNGN</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 py-4">
      <Steps currentStep={currentStep} className="mb-8">
        <Step title="Connect Wallet" description="Connect to MetaMask" completed={currentStep >= 0} />
        <Step title="Enter Details" description="Amount and destination chain" completed={currentStep >= 1} />
        <Step title="Bridge Tokens" description="Approve and bridge" completed={currentStep >= 2} />
        <Step title="Monitor Status" description="Track bridge progress" completed={currentStep >= 3} />
      </Steps>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bridge-amount">Amount (cNGN)</Label>
            <Input
              id="bridge-amount"
              type="number"
              placeholder="Enter amount to bridge"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isBridging}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination-chain">Destination Chain</Label>
            <Select
              value={destinationChainId}
              onValueChange={setDestinationChainId}
              disabled={isBridging || isLoadingChains}
            >
              <SelectTrigger id="destination-chain">
                <SelectValue placeholder="Select destination chain" />
              </SelectTrigger>
              <SelectContent>
                {chains
                  .filter((chain) => chain.id !== chainId)
                  .map((chain) => (
                    <SelectItem key={chain.id} value={chain.id.toString()} disabled={chain.status === "inactive"}>
                      {chain.name}
                      {chain.status === "congested" && " (Congested)"}
                      {chain.status === "inactive" && " (Inactive)"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {bridgeStatus && (
            <Alert
              className={
                bridgeStatus === "completed"
                  ? "bg-green-50 text-green-800 border-green-200"
                  : bridgeStatus === "failed"
                    ? "bg-red-50 text-red-800 border-red-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
              }
            >
              <AlertDescription>
                {bridgeStatus === "pending" && "Bridge initiated. Waiting for confirmation..."}
                {bridgeStatus === "processing" && "Processing bridge transaction..."}
                {bridgeStatus === "completed" && "Bridge completed successfully!"}
                {bridgeStatus === "failed" && "Bridge failed. Please contact support."}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleBridge}
            disabled={isBridging || !amount || !destinationChainId || bridgeStatus === "processing"}
            className="w-full"
          >
            {isBridging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bridge cNGN
          </Button>

          {txHash && (
            <div className="text-sm text-center">
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                View transaction <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && !error && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

