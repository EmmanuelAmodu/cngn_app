"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

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
							<button
								type="button"
								onClick={openConnectModal}
								className="bg-primary hover:bg-primary/90 border px-4 py-2 rounded-md flex items-center gap-2"
							>
								<span className="h-4 w-4">
									<svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <title>Wallet Icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1v-6m-4 0h4m-4 0V9m0 2h.01"
                    />
                  </svg>
								</span>
								Connect Wallet
							</button>
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
