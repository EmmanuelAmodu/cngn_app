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
import { useAccount } from "wagmi"

export default function Home() {
  // Use wagmi hooks to get the connected address and current chain
  const { address, chainId } = useAccount();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="mt-4">
            <ConnectWallet />
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

