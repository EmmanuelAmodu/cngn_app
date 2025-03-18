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
import TransactionsTable from "./transactions-table";
import { usePolling } from "@/hooks/use-polling";
import { useAccount } from "wagmi";
import { getPublicClient } from "@/lib/blockchain";
import { type Address, erc20Abi } from "viem";
import type { Transaction } from "@/hooks/use-transactions";
import BankAccountDetails from "./bank-account-details";

interface OnrampFormProps {
	address: string | undefined;
	chainId: number | undefined;
}

interface VirtualAccount {
	accountNumber: string;
	bankName: string;
	accountName: string;
	reference?: string;
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
	const [onRampTransactions, setOnRampTransactions] = useState<Transaction[]>([]);
	const acconunt = useAccount();

	// Handle account fetched
	const handleAccountFetched = useCallback((account: VirtualAccount | null) => {
		if (account) {
			setVirtualAccount(account);
			setCurrentStep(1);
		}
	}, []);

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
				currency: "NGN",
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
			<Steps currentStep={currentStep} className="mb-8">
				<Step title="Enter Details" description="Personal information" completed={currentStep >= 0} />
				<Step title="Get Account" description="Virtual account details" completed={currentStep >= 1} />
				<Step title="Complete" description="View transaction details" completed={currentStep >= 2} />
			</Steps>

			{currentStep === 0 && (
				<Card>
					<CardContent className="pt-6 space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="firstName">First Name</Label>
								<Input
									id="firstName"
									name="firstName"
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
									value={userDetails.lastName}
									onChange={handleInputChange}
									disabled={isLoading}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
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
								value={userDetails.mobileNumber}
								onChange={handleInputChange}
								disabled={isLoading}
							/>
						</div>

						<Button onClick={handleGenerateAccount} disabled={isLoading} className="w-full">
							{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Generate Virtual Account
						</Button>
					</CardContent>
				</Card>
			)}

			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{success && !error && (
				<Alert className="bg-green-50 text-green-800 border-green-200">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{success}</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
