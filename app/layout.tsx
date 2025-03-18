import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { crossChainPolling } from "@/lib/cross-chain";
import { offRampPolling } from "@/lib/off-ramp";
import "./globals.css";
import { Providers } from "@/components/Providers"; // adjust the path as needed
import { onRampPolling } from "@/lib/on-ramp";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "cNGN DEX",
  description: "Easily onramp, offramp, and bridge your cNGN tokens",
  generator: "v0.dev",
};

// Initialize wallet client and event listeners
if (process.env.ADMIN_PRIVATE_KEY) {
  try {
    console.log("Initializing blockchain services...");
    crossChainPolling();
    offRampPolling();
    onRampPolling();
    console.log("Blockchain services initialized successfully");
  } catch (error) {
    console.error("Error initializing blockchain services:", error);
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
