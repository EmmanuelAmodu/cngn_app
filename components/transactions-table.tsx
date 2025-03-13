"use client"

import { useState } from "react"
import { CalendarIcon, DownloadIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Sample transaction data
const transactions = [
  {
    id: "TX123456",
    date: "2023-04-15",
    description: "Online Purchase",
    amount: 125.99,
    status: "successful",
  },
  {
    id: "TX123457",
    date: "2023-04-14",
    description: "Subscription Payment",
    amount: 9.99,
    status: "successful",
  },
  {
    id: "TX123458",
    date: "2023-04-14",
    description: "Fund Transfer",
    amount: 500.0,
    status: "pending",
  },
  {
    id: "TX123459",
    date: "2023-04-13",
    description: "Withdrawal",
    amount: 200.0,
    status: "processing",
  },
  {
    id: "TX123460",
    date: "2023-04-12",
    description: "Deposit",
    amount: 1000.0,
    status: "successful",
  },
  {
    id: "TX123461",
    date: "2023-04-11",
    description: "Bill Payment",
    amount: 85.75,
    status: "pending",
  },
  {
    id: "TX123462",
    date: "2023-04-10",
    description: "Refund",
    amount: 49.99,
    status: "processing",
  },
]

export default function TransactionsTable() {
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
      case "successful":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            Successful
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
              onClick={() => setActiveFilter("successful")}
              className="rounded-full"
            >
              Successful
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.id}</TableCell>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
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
