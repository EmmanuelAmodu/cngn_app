"use client"

import { useState } from "react"
import { CalendarIcon, Copy, DownloadIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export interface TransactionTableData {
  amount: number;
  chain_id: number;
  created_at: string; // ISO timestamp
  on_chain_tx: string | null;
  onramp_id: string;
  payment_reference: string;
  status: 'pending' | 'completed' | 'failed'; // assuming these are possible statuses
  updated_at: string; // ISO timestamp
  user_address: string;
};

interface TransactionsTableProps {
  transactions: TransactionTableData[];
  copyToClipboard: (text: string) => void;
}

export default function TransactionsTable({transactions, copyToClipboard}: TransactionsTableProps) {
  const [activeFilter, setActiveFilter] = useState("all")

  // Filter transactions based on active filter
  const filteredTransactions =
    activeFilter === "all" ? transactions : transactions.filter((transaction) => transaction.status === activeFilter)

  // Function to get badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
            Pending
          </Badge>
        )
      case "processing":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            Processing
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            Completed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transactions</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search transactions..." className="w-full pl-8" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Filter by date
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              onClick={() => setActiveFilter("all")}
              className="rounded-full"
            >
              All
            </Button>
            <Button
              variant={activeFilter === "pending" ? "default" : "outline"}
              onClick={() => setActiveFilter("pending")}
              className="rounded-full"
            >
              Pending
            </Button>
            <Button
              variant={activeFilter === "processing" ? "default" : "outline"}
              onClick={() => setActiveFilter("processing")}
              className="rounded-full"
            >
              Processing
            </Button>
            <Button
              variant={activeFilter === "successful" ? "default" : "outline"}
              onClick={() => setActiveFilter("completed")}
              className="rounded-full"
            >
              Completed
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>TX Hash</TableHead>
                  <TableHead>Chain ID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.onramp_id}>
                      <TableCell className="font-medium">
                        {`${transaction.onramp_id.slice(0, 5)}...${transaction.onramp_id.slice(transaction.onramp_id.length - 5)}`}
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(transaction.onramp_id)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>{transaction.created_at.split("T")[0]}</TableCell>
                      <TableCell>
                        {`${transaction.on_chain_tx ? transaction.on_chain_tx.slice(0, 5) : ''}`}
                        {`${transaction.on_chain_tx ? '...' : ''}`}
                        {`${transaction.on_chain_tx ? transaction.on_chain_tx.slice(transaction.on_chain_tx.length - 5) : ''}`}
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(transaction.on_chain_tx || '')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{transaction.chain_id}</TableCell>
                      <TableCell className="text-right">${transaction.amount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
