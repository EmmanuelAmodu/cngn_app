import type { NumeroVirtualAccountRequest, NumeroVirtualAccountResponse } from "./types/numero"

export async function createVirtualAccount(data: NumeroVirtualAccountRequest): Promise<NumeroVirtualAccountResponse> {
  try {
    // Instead of directly using crypto here, we'll call our API endpoint
    const response = await fetch("/api/virtualaccount/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to create virtual account")
    }

    return response.json()
  } catch (error) {
    console.error("Error creating virtual account:", error)
    throw error
  }
}

