"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Loader2, AlertCircle } from "lucide-react"
import { getTransactionStats } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Stats {
  onrampVolume: string
  offrampVolume: string
  bridgeVolume: string
  totalTransactions: number
}

export function Stats() {
  const [stats, setStats] = useState<Stats>({
    onrampVolume: "0",
    offrampVolume: "0",
    bridgeVolume: "0",
    totalTransactions: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getTransactionStats()
        setStats(data)
      } catch (error) {
        console.error("Failed to load stats:", error)
        setError("Unable to load transaction statistics. Please try again later.")
        // Keep the current stats if we have them, otherwise use defaults
        setStats(
          (prev) =>
            prev || {
              onrampVolume: "0",
              offrampVolume: "0",
              bridgeVolume: "0",
              totalTransactions: 0,
            },
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()

    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Onramp Volume</p>
            <p className="text-2xl font-bold">{stats.onrampVolume} cNGN</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <ArrowUpRight className="h-6 w-6 text-green-700 dark:text-green-300" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Offramp Volume</p>
            <p className="text-2xl font-bold">{stats.offrampVolume} cNGN</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <ArrowDownRight className="h-6 w-6 text-red-700 dark:text-red-300" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Bridge Volume</p>
            <p className="text-2xl font-bold">{stats.bridgeVolume} cNGN</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <ArrowLeftRight className="h-6 w-6 text-blue-700 dark:text-blue-300" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

