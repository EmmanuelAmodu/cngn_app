"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button"

export default function ConnectWallet() {
	return (
		<div className="flex flex-col gap-2">
			<ConnectButton.Custom>
				{({
					account,
					chain,
					openConnectModal,
					openAccountModal,
					openChainModal,
					mounted,
				}) => {
					if (!mounted) return null;

					// When not connected, show the connect button.
					if (!account) {
						return (
							<div className="flex flex-col gap-2">
								<Button
									type="button"
									onClick={openConnectModal}
									className="bg-primary hover:bg-primary/90 border px-4 py-2 rounded-md gap-2"
								>
									<WalletIcon className="mr-2 h-4 w-4" />
									Connect Wallet
								</Button>
							</div>
						);
					}

					return (
						<div className="flex flex-col sm:flex-row items-center gap-2">
							<div
								onClick={openAccountModal}
								onKeyUp={(e) => e.key === "Enter" && openAccountModal()}
								className="px-4 py-2 bg-green-100 text-green-800 rounded-md font-medium cursor-pointer"
							>
								{account.displayName}
							</div>
							<button
								type="button"
								onClick={openChainModal}
								className="px-4 py-2 border rounded-md"
							>
								{chain?.unsupported ? "Wrong network" : chain?.name}
							</button>
						</div>
					);
				}}
			</ConnectButton.Custom>
		</div>
	);
}
