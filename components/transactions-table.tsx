"use client";

import { useState } from "react";
import {
	CalendarIcon,
	Copy,
	DownloadIcon,
	SearchIcon,
	Loader2,
	ArrowDownIcon,
	ArrowUpIcon,
	ArrowRightLeftIcon,
	BuildingIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTransactions, type Transaction } from "@/hooks/use-transactions";

interface TransactionsTableProps {
	userAddress?: string;
	chainId?: number;
}

export default function TransactionsTable({
	userAddress,
}: TransactionsTableProps) {
	const [activeFilter, setActiveFilter] = useState("all");
	const { transactions, isLoading, error } = useTransactions({
		userAddress,
	});

	// Function to copy text to clipboard
	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
		} catch (err) {
			console.error("Failed to copy text:", err);
		}
	};

	// Function to get badge for transaction type
	const getTypeBadge = (type: string) => {
		switch (type) {
			case "payin":
				return (
					<Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900/50">
						<ArrowDownIcon className="mr-1 h-3 w-3" />
						Payin
					</Badge>
				);
			case "payout":
				return (
					<Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50">
						<ArrowUpIcon className="mr-1 h-3 w-3" />
						Payout
					</Badge>
				);
			case "bridge":
				return (
					<Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-900/50">
						<BuildingIcon className="mr-1 h-3 w-3" />
						Bridge
					</Badge>
				);
			case "swap":
				return (
					<Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50">
						<ArrowRightLeftIcon className="mr-1 h-3 w-3" />
						Swap
					</Badge>
				);
			default:
				return <Badge>{type}</Badge>;
		}
	};

	// Filter transactions based on active filter
	const filteredTransactions =
		activeFilter === "all"
			? transactions
			: transactions.filter(
					(transaction) => transaction.status === activeFilter,
				);

	// Function to get badge color based on status
	const getStatusBadge = (status: string) => {
		switch (status) {
			case "pending":
				return (
					<Badge
						variant="outline"
						className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900"
					>
						Pending
					</Badge>
				);
			case "processing":
				return (
					<Badge
						variant="outline"
						className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
					>
						Processing
					</Badge>
				);
			case "completed":
				return (
					<Badge
						variant="outline"
						className="bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900"
					>
						Completed
					</Badge>
				);
			case "failed":
				return (
					<Badge
						variant="outline"
						className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900"
					>
						Failed
					</Badge>
				);
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	if (error) {
		return (
			<Alert className="mt-4 bg-red-50 text-red-800 border-red-200">
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}

	return (
		<Card className="w-full max-w-4xl mx-auto">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Transactions</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
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
							variant={activeFilter === "completed" ? "default" : "outline"}
							onClick={() => setActiveFilter("completed")}
							className="rounded-full"
						>
							Completed
						</Button>
						<Button
							variant={activeFilter === "failed" ? "default" : "outline"}
							onClick={() => setActiveFilter("failed")}
							className="rounded-full"
						>
							Failed
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
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading ? (
									<TableRow>
										<TableCell colSpan={6} className="text-center py-6">
											<Loader2 className="h-4 w-4 animate-spin mx-auto" />
										</TableCell>
									</TableRow>
								) : filteredTransactions.length > 0 ? (
									filteredTransactions.map((transaction) => (
										<TableRow key={transaction.id}>
											<TableCell className="font-medium">
												{`${transaction.id.slice(0, 5)}...${transaction.id.slice(transaction.id.length - 5)}`}
												<Button
													variant="ghost"
													size="sm"
													onClick={() => copyToClipboard(transaction.id)}
												>
													<Copy className="h-4 w-4" />
												</Button>
											</TableCell>
											<TableCell>
												{transaction.createdAt.split("T")[0]}
											</TableCell>
											<TableCell>
												{transaction.onChainTx && (
													<>
														{`${transaction.onChainTx.slice(0, 5)}...${transaction.onChainTx.slice(transaction.onChainTx.length - 5)}`}
														<Button
															variant="ghost"
															size="sm"
															onClick={() =>
																copyToClipboard(transaction.onChainTx || "")
															}
														>
															<Copy className="h-4 w-4" />
														</Button>
													</>
												)}
											</TableCell>
											<TableCell>{transaction.chainId}</TableCell>
											<TableCell className="text-right">
												₦{transaction.amount.toFixed(2)}
											</TableCell>
											<TableCell>{getTypeBadge(transaction.type)}</TableCell>
											<TableCell>
												{getStatusBadge(transaction.status)}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell
											colSpan={6}
											className="text-center py-6 text-muted-foreground"
										>
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
	);
}
