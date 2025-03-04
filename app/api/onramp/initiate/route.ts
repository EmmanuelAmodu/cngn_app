import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { randomBytes } from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userAddress, amount, firstName, lastName, email, mobileNumber } = body

    console.log("Received onramp initiation request:", {
      userAddress,
      amount,
      firstName,
      lastName,
      email,
      mobileNumber: mobileNumber ? "REDACTED" : "MISSING",
    })

    if (!userAddress || !amount || !firstName || !lastName || !email || !mobileNumber) {
      console.error("Missing required fields for onramp initiation:", {
        userAddress: !userAddress,
        amount: !amount,
        firstName: !firstName,
        lastName: !lastName,
        email: !email,
        mobileNumber: !mobileNumber,
      })
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    // Generate onrampId
    const onrampId = `0x${randomBytes(32).toString("hex")}`
    console.log("Generated onrampId:", onrampId)

    // Create virtual account via our API endpoint
    console.log("Calling virtual account creation endpoint")

    let responseData
    try {
      const numeroResponse = await fetch(`${request.headers.get("origin")}/api/virtualaccount/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          mobileNumber,
        }),
      })

      if (!numeroResponse.ok) {
        const errorText = await numeroResponse.text()
        console.error("Virtual account creation failed:", errorText)

        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || "Failed to create virtual account")
        } catch (e) {
          throw new Error("Failed to create virtual account: " + errorText)
        }
      }

      responseData = await numeroResponse.json()
      console.log("Virtual account creation response:", responseData)

      if (!responseData.status) {
        throw new Error(responseData.message || "Failed to create virtual account")
      }
    } catch (error) {
      console.error("Error creating virtual account:", error)

      // For development/testing, use mock data if in development environment
      if (process.env.NODE_ENV === "development") {
        console.log("Using mock data for development environment")
        responseData = {
          status: true,
          message: "Virtual account created successfully (MOCK)",
          data: {
            reference: `VA${Date.now()}`,
            accountName: `${firstName} ${lastName}`,
            accountNumber: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            bankName: "Test Bank",
          },
        }
      } else {
        throw error
      }
    }

    console.log("Saving to Supabase:", {
      onramp_id: onrampId,
      user_address: userAddress,
      virtual_account: responseData.data.accountNumber,
      bank_name: responseData.data.bankName,
      account_name: responseData.data.accountName,
    })

    // Save to Supabase
    try {
      const { error } = await supabaseAdmin.from("onramp_requests").insert({
        onramp_id: onrampId,
        user_address: userAddress,
        virtual_account: responseData.data.accountNumber,
        bank_name: responseData.data.bankName,
        account_name: responseData.data.accountName,
        reference: responseData.data.reference,
      })

      if (error) {
        console.error("Supabase insert error:", error)
        throw error
      }
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json(
        {
          error: "Failed to save virtual account details",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }

    console.log("Onramp initiation successful")
    return NextResponse.json({
      success: true,
      onrampId,
      virtualAccount: responseData.data.accountNumber,
      bankName: responseData.data.bankName,
      accountName: responseData.data.accountName,
      reference: responseData.data.reference,
    })
  } catch (error) {
    console.error("Error in onramp initiate:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

