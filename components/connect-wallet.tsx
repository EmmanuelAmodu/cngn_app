"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { WalletIcon } from "lucide-react"

interface ConnectWalletProps {
  address: string | null
  setAddress: (address: string | null) => void
  setChainId: (chainId: number | null) => void
}

export default function ConnectWallet({ address, setAddress, setChainId }: ConnectWalletProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    // Check if MetaMask is already connected
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          })

          if (accounts.length > 0) {
            setAddress(accounts[0])
            const chainIdHex = await window.ethereum.request({
              method: "eth_chainId",
            })
            setChainId(Number.parseInt(chainIdHex, 16))
          }
        } catch (error) {
          console.error("Error checking connection:", error)
        }
      }
    }

    checkConnection()

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0])
        } else {
          setAddress(null)
        }
      })

      window.ethereum.on("chainChanged", (chainIdHex: string) => {
        setChainId(Number.parseInt(chainIdHex, 16))
      })
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged")
        window.ethereum.removeAllListeners("chainChanged")
      }
    }
  }, [setAddress, setChainId])

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this feature")
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })
      setAddress(accounts[0])

      const chainIdHex = await window.ethereum.request({
        method: "eth_chainId",
      })
      setChainId(Number.parseInt(chainIdHex, 16))
    } catch (error) {
      console.error("Error connecting wallet:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setAddress(null)
    setChainId(null)
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div>
      {!address ? (
        <Button onClick={connectWallet} disabled={isConnecting} className="bg-primary hover:bg-primary/90">
          <WalletIcon className="mr-2 h-4 w-4" />
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md font-medium">{formatAddress(address)}</div>
          <Button variant="outline" size="sm" onClick={disconnectWallet}>
            Disconnect
          </Button>
        </div>
      )}
    </div>
  )
}

// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum: any
  }
}

