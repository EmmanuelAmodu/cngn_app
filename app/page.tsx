"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import OnrampForm from "@/components/onramp-form"
import OfframpForm from "@/components/offramp-form"
import BridgeForm from "@/components/bridge-form"
import ConnectWallet from "@/components/connect-wallet"
import { ThemeToggle } from "@/components/theme-toggle"
import { Stats } from "@/components/stats"
import { useAccount } from "wagmi"
import { MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import BankAccountDetails from "@/components/bank-account-details"
import TransactionsTable from "@/components/transactions-table"

export default function Home() {
  // Use wagmi hooks to get the connected address and current chain
  const { address, chainId } = useAccount();
  const [darkMode, setDarkMode] = useState(false)

  // Initialize polling
  useEffect(() => {
    const initializePolling = async () => {
      try {
        const response = await fetch('/api/polling');
        const data = await response.json();
        console.log('Polling initialization:', data);
      } catch (error) {
        console.error('Failed to initialize polling:', error);
      }
    };

    initializePolling();
  }, []);

  // Initialize dark mode based on user preference
  useEffect(() => {
    // Always start with dark mode enabled
    document.documentElement.classList.add("dark")

    // The following is now optional but kept for future flexibility
    // Check if user prefers dark mode
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    // Only update if the user preference doesn't match our default
    if (!prefersDark) {
      // We still initialize with dark mode, but we track the user's system preference
      setDarkMode(true)
    }
  }, [])

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle("dark")
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 p-4">
      <ConnectWallet />
      {/* Dark Mode Toggle */}
      <div className="flex justify-end">
        <Button variant="outline" size="icon" onClick={toggleDarkMode} className="rounded-full">
          {darkMode ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
          <span className="sr-only">{darkMode ? "Light mode" : "Dark mode"}</span>
        </Button>
      </div>

      <BankAccountDetails 
        userAddress={address as `0x${string}`}
        chainId={chainId || 1}
      />

      <TransactionsTable
        userAddress={address as `0x${string}`}
        chainId={chainId || 1}
      />
    </div>
  )
}
