"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import OnrampForm from "@/components/onramp-form"
import OfframpForm from "@/components/offramp-form"
import BridgeForm from "@/components/bridge-form"
import ConnectWallet from "@/components/connect-wallet"
import { ThemeToggle } from "@/components/theme-toggle"
import { Stats } from "@/components/stats"

export default function Home() {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10" /> {/* Spacer for centering */}
            <CardTitle className="text-3xl font-bold">cNGN DEX</CardTitle>
            <ThemeToggle />
          </div>
          <CardDescription>Easily onramp, offramp, and bridge your cNGN tokens</CardDescription>
          <div className="mt-4">
            <ConnectWallet address={address} setAddress={setAddress} setChainId={setChainId} />
          </div>
          <div className="mt-8">
            <Stats />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="onramp" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="onramp">Onramp</TabsTrigger>
              <TabsTrigger value="offramp">Offramp</TabsTrigger>
              <TabsTrigger value="bridge">Bridge</TabsTrigger>
            </TabsList>
            <TabsContent value="onramp">
              <OnrampForm address={address} chainId={chainId} />
            </TabsContent>
            <TabsContent value="offramp">
              <OfframpForm address={address} chainId={chainId} />
            </TabsContent>
            <TabsContent value="bridge">
              <BridgeForm address={address} chainId={chainId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}

