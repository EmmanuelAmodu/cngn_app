"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { WalletIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { chainConfigs } from "@/lib/constants"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface ConnectWalletProps {
  address: string | null
  setAddress: (address: string | null) => void
  setChainId: (chainId: number | null) => void
  chainId: number | null
}

export default function ConnectWallet({ address, setAddress, setChainId, chainId }: ConnectWalletProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [supportedNetworks, setSupportedNetworks] = useState<{ id: number; name: string }[]>([])
  const [networkSwitchError, setNetworkSwitchError] = useState<string | null>(null)
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)

  useEffect(() => {
    // Create a list of supported networks from chainConfigs
    const networks = Object.entries(chainConfigs).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
    }))
    setSupportedNetworks(networks)

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

  const switchNetwork = async (networkId: string) => {
    const chainId = Number.parseInt(networkId)
    if (!window.ethereum) {
      setNetworkSwitchError("MetaMask is not installed. Please install MetaMask to switch networks.")
      return
    }

    setIsSwitchingNetwork(true)
    setNetworkSwitchError(null)

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })

      // Update the UI to reflect the new network
      setChainId(chainId)
      console.log(`Switched to network: ${chainConfigs[chainId]?.name || "Unknown"} (${chainId})`)
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if ((switchError as { code: number }).code === 4902) {
        try {
          const network = chainConfigs[chainId]
          if (!network) {
            throw new Error(`Network configuration not found for chain ID ${chainId}`)
          }

          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          })

          // After adding the network, try to switch to it again
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          })

          // Update the UI to reflect the new network
          setChainId(chainId)
          console.log(`Added and switched to network: ${network.name} (${chainId})`)
        } catch (addError) {
          console.error("Error adding network:", addError)
          setNetworkSwitchError(`Failed to add network: ${(addError as { message: string }).message || "Unknown error"}`)
        }
      } else {
        console.error("Error switching network:", switchError)
        setNetworkSwitchError(`Failed to switch network: ${(switchError as { message: string }).message || "Unknown error"}`)
      }
    } finally {
      setIsSwitchingNetwork(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div className="flex flex-col gap-2">
      {!address ? (
        <Button onClick={connectWallet} disabled={isConnecting} className="bg-primary hover:bg-primary/90">
          <WalletIcon className="mr-2 h-4 w-4" />
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </Button>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md font-medium dark:bg-green-900 dark:text-green-100">
              {formatAddress(address)}
            </div>
            <Button variant="outline" size="sm" onClick={disconnectWallet}>
              Disconnect
            </Button>

            <Select onValueChange={switchNetwork} value={chainId?.toString()} disabled={isSwitchingNetwork}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Network">
                  {isSwitchingNetwork
                    ? "Switching..."
                    : chainId
                      ? chainConfigs[chainId]?.name || "Unknown Network"
                      : "Select Network"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {supportedNetworks.map((network) => (
                  <SelectItem key={network.id} value={network.id.toString()}>
                    {network.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {networkSwitchError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{networkSwitchError}</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  )
}

// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ethereum: any
  }
}
