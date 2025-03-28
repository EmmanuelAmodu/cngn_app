"use client";

import type React from "react";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	CheckCircle2,
	AlertCircle,
	Loader2,
	Copy,
	CreditCardIcon,
} from "lucide-react";
import { Steps, Step } from "@/components/ui/steps";
import { Card, CardContent } from "@/components/ui/card";
import {
	generateVirtualAccountAPI,
	fetchDepositAPI,
	fetchVirtualAccountAPI,
} from "@/lib/api";
import { chainConfigs } from "@/lib/constants";
import TransactionsTable, {
	type TransactionTableData,
} from "./transactions-table";
import { usePolling } from "@/hooks/use-polling";
import { useAccount } from "wagmi";
import { getPublicClient } from "@/lib/blockchain";
import { type Address, erc20Abi } from "viem";

interface OnrampFormProps {
	address: string | undefined;
	chainId: number | undefined;
}

interface VirtualAccount {
	accountNumber: string;
	bankName: string;
	accountName: string;
	reference: string;
}

interface UserDetails {
	firstName: string;
	lastName: string;
	email: string;
	mobileNumber: string;
}

export default function OnrampForm({ address, chainId }: OnrampFormProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [balance, setBalance] = useState<number>(0);
	const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(
		null,
	);
	const [userDetails, setUserDetails] = useState<UserDetails>({
		firstName: "",
		lastName: "",
		email: "",
		mobileNumber: "",
	});
	const [onRampTransactions, setOnRampTransactions] = useState<
		TransactionTableData[]
	>([]);
	const acconunt = useAccount();

	useEffect(() => {
		if (address) {
			console.log("Fetching Account");
			setIsLoading(true);
			fetchVirtualAccountAPI(address.toLowerCase())
				.then((data) => {
					if (data) {
						console.log("VA Account data");
						setVirtualAccount(data);
						setCurrentStep(1);
					}

					setIsLoading(false);
				})
				.catch((err) => {
					setIsLoading(false);
				});
		}
	}, [address]);

	// Add this function at the beginning of the OnrampForm component
	const ensureCorrectNetwork = async () => {
		if (!chainId) {
			setError("Please connect your wallet first");
			return false;
		}

		if (!window.ethereum) {
			setError("MetaMask is not installed");
			return false;
		}

		try {
			const chainIdHex = await window.ethereum.request({
				method: "eth_chainId",
			});
			const currentChainId = Number.parseInt(chainIdHex, 16);

			if (currentChainId !== chainId) {
				setError(
					`Please switch your wallet to ${chainConfigs[chainId].name} network to continue`,
				);

				// Prompt the user to switch networks
				try {
					await window.ethereum.request({
						method: "wallet_switchEthereumChain",
						params: [{ chainId: `0x${chainId.toString(16)}` }],
					});
					return true;
				} catch (switchError) {
					console.error("Failed to switch networks:", switchError);
					return false;
				}
			}

			return true;
		} catch (error) {
			console.error("Error checking network:", error);
			setError("Failed to verify network. Please try again.");
			return false;
		}
	};

	// Copy to clipboard function
	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setSuccess("Copied to clipboard!");
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			setError("Failed to copy to clipboard");
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setUserDetails((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	// Update the handleGenerateAccount function to check network first
	const handleGenerateAccount = async () => {
		if (!address) {
			setError("Please connect your wallet first");
			return;
		}

		// Ensure wallet is on the correct network
		const isCorrectNetwork = await ensureCorrectNetwork();
		if (!isCorrectNetwork) return;

		// Validate user details
		if (
			!userDetails.firstName ||
			!userDetails.lastName ||
			!userDetails.email ||
			!userDetails.mobileNumber
		) {
			setError("Please fill in all required fields");
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(userDetails.email)) {
			setError("Please enter a valid email address");
			return;
		}

		// Validate mobile number (basic validation)
		if (!/^\d{10,15}$/.test(userDetails.mobileNumber.replace(/[^0-9]/g, ""))) {
			setError("Please enter a valid mobile number");
			return;
		}

		setError(null);
		setIsLoading(true);

		try {
			console.log("Generating virtual account with details:", {
				userAddress: address,
				firstName: userDetails.firstName,
				lastName: userDetails.lastName,
				email: userDetails.email,
				mobileNumber: "REDACTED",
				chainId: chainId,
			});

			const account = await generateVirtualAccountAPI({
				userAddress: address,
				...userDetails,
				chainId: chainId || 1,
			});

			if (!account.status || !account.data) {
				throw new Error(
					account.message || "Failed to generate virtual account",
				);
			}

			setVirtualAccount(account.data);
			console.log(account);
			setCurrentStep(1);
			setSuccess("Virtual account generated successfully!");
		} catch (err) {
			console.error("Virtual account generation error:", err);
			setError(
				(err as { message: string }).message ||
					"Failed to generate virtual account. Please try again.",
			);
			setCurrentStep(0);
		} finally {
			setIsLoading(false);
		}
	};

	// Update the handleConfirmDeposit function to check network first
	const handleConfirmDeposit = async () => {
		if (!virtualAccount) {
			setError("No virtual account found");
			return;
		}

		// Ensure wallet is on the correct network
		const isCorrectNetwork = await ensureCorrectNetwork();
		if (!isCorrectNetwork) return;

		setError(null);
		setIsLoading(true);

		if (!acconunt.address || !chainId) return;
		try {
			const response = await fetchDepositAPI(chainId, acconunt.address);
			setOnRampTransactions(response.data);
		} catch (err) {
			console.error("Deposit confirmation error:", err);
			setError(
				(err as { message: string }).message ||
					"Failed to confirm deposit. Please ensure you have made the transfer and try again.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	usePolling(
		() => {
			console.log("Polling for new transactions...");
			handleConfirmDeposit();
		},
		10000,
		{
			immediate: true,
			start: !!virtualAccount && !!chainId && !!acconunt.address,
		},
	);

	const getBalance = async (chainId: number, address: Address) => {
		const publicClient = getPublicClient(chainId);
		const decimals = await publicClient.readContract({
			address: chainConfigs[chainId].tokenAddress as `0x${string}`,
			abi: erc20Abi,
			functionName: "decimals",
		});
	
		const balance = await publicClient.readContract({
			address: chainConfigs[chainId].tokenAddress as `0x${string}`,
			abi: erc20Abi,
			functionName: "balanceOf",
			args: [address],
		});

		setBalance(Number(balance) / (10 ** Number(decimals)));
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (!chainId || !acconunt.address) return;
		getBalance(chainId, acconunt.address)
	}, [chainId, acconunt.address]);

	if (!address) {
		return (
			<Alert className="mt-4 bg-amber-50 text-amber-800 border-amber-200">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>
					Please connect your wallet to begin onramping
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="space-y-6 py-4">
			<div className="space-y-6">
				{currentStep === 0 && (
					<Card>
						<CardContent className="pt-6 space-y-4">
							<div className="space-y-2">
								<Label htmlFor="firstName">First Name</Label>
								<Input
									id="firstName"
									name="firstName"
									placeholder="Enter your first name"
									value={userDetails.firstName}
									onChange={handleInputChange}
									disabled={isLoading}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="lastName">Last Name</Label>
								<Input
									id="lastName"
									name="lastName"
									placeholder="Enter your last name"
									value={userDetails.lastName}
									onChange={handleInputChange}
									disabled={isLoading}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									name="email"
									type="email"
									placeholder="Enter your email"
									value={userDetails.email}
									onChange={handleInputChange}
									disabled={isLoading}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="mobileNumber">Mobile Number</Label>
								<Input
									id="mobileNumber"
									name="mobileNumber"
									placeholder="Enter your mobile number"
									value={userDetails.mobileNumber}
									onChange={handleInputChange}
									disabled={isLoading}
								/>
							</div>

							<Button
								onClick={handleGenerateAccount}
								disabled={isLoading}
								className="w-full"
							>
								{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Generate Virtual Account
							</Button>
						</CardContent>
					</Card>
				)}

				{currentStep === 1 && virtualAccount && (
					<div>
						<Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border shadow-sm my-4">
							<CardContent className="p-4">
								<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
									<div className="flex items-center gap-3">
										<div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
											<CreditCardIcon className="h-5 w-5 text-primary" />
										</div>
										<div>
											<p className="text-sm text-muted-foreground">Account Info</p>
											<p className="text-lg font-bold">{virtualAccount.accountName}</p>
											<p className="text-sm font-medium">
												{virtualAccount.accountNumber}
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														copyToClipboard(virtualAccount.accountNumber)
													}
												>
													<Copy className="h-4 w-4" />
												</Button>
											</p>
										</div>
									</div>
									<div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-sm">
										<div>
											<p className="text-muted-foreground">Bank</p>
											<p className="font-medium">{virtualAccount.bankName}</p>
										</div>
										<div>
											<p className="text-muted-foreground">Routing</p>
											<p className="font-medium">N/A</p>
										</div>
										<div>
											<p className="text-muted-foreground">Wallet Balance</p>
											<p className="font-medium text-primary">₦{balance}</p>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						<TransactionsTable
							transactions={onRampTransactions}
							copyToClipboard={copyToClipboard}
						/>
					</div>
				)}

				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
			</div>
		</div>
	);
}
