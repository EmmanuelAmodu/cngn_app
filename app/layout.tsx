import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { startEventListeners } from "@/lib/event-listener";
import { Providers } from "@/components/Providers"; // adjust the path as needed

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
    startEventListeners();
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

import './globals.css'
