import { NextResponse } from "next/server";
import { crossChainPolling } from "@/lib/cross-chain";
import { offRampPolling } from "@/lib/off-ramp";
import { onRampPolling } from "@/lib/on-ramp";

let isPollingInitialized = false;

export async function GET() {
  try {
    if (!isPollingInitialized) {
      // Start all polling functions
      Promise.all([
        crossChainPolling(),
        offRampPolling(),
        onRampPolling()
      ]).catch(error => {
        console.error("Error in polling functions:", error);
      });

      isPollingInitialized = true;
      
      return NextResponse.json({
        success: true,
        message: "Polling initialized successfully"
      });
    }

    return NextResponse.json({
      success: true,
      message: "Polling already running"
    });
  } catch (error) {
    console.error("Error initializing polling:", error);
    return NextResponse.json(
      { error: "Failed to initialize polling" },
      { status: 500 }
    );
  }
} 