"use client";

import {
	ArrowRightLeftIcon,
  SendIcon,
  BuildingIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import SwapForm from "./swap-form";
import BridgeFormV2 from "./bridge-form-v2";
import PayoutForm from "./payout-form";

export default function TransactionsOperations() {
  const [activeTab, setActiveTab] = useState("payout");

	return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Transaction Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="payout" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="payout" className="flex items-center gap-1">
                <SendIcon className="h-4 w-4" />
                Payout
              </TabsTrigger>
              <TabsTrigger value="bridge" className="flex items-center gap-1">
                <BuildingIcon className="h-4 w-4" />
                Bridge
              </TabsTrigger>
              <TabsTrigger value="swap" className="flex items-center gap-1">
                <ArrowRightLeftIcon className="h-4 w-4" />
                Swap
              </TabsTrigger>
            </TabsList>

            {/* Payout Tab Content */}
            <TabsContent value="payout">
              <PayoutForm />
            </TabsContent>

            {/* Bridge Tab Content */}
            <TabsContent value="bridge">
              <BridgeFormV2 />
            </TabsContent>

            {/* Swap Tab Content */}
            <TabsContent value="swap">
              <SwapForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
	);
}
