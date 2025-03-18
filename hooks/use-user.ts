import { useState, useEffect } from "react"
import { useAccount } from "wagmi"

interface User {
  id: string
  address: string
  firstName: string
  lastName: string
  email: string
  mobileNumber: string
  createdAt: string
  updatedAt: string
}

export function useUser() {
  const { address, isConnected } = useAccount()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUser() {
      if (!address || !isConnected) {
        setUser(null)
        setShowOnboarding(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/users?address=${address}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch user")
        }

        if (data.data) {
          setUser(data.data)
          setShowOnboarding(false)
        } else {
          setUser(null)
          setShowOnboarding(true)
        }
      } catch (err) {
        console.error("Error fetching user:", err)
        setError(
          err instanceof Error ? err.message : "Failed to fetch user. Please try again."
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [address, isConnected])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    // Refetch user data
    if (address && isConnected) {
      fetch(`/api/users?address=${address}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.data) {
            setUser(data.data)
          }
        })
        .catch((err) => {
          console.error("Error fetching user after onboarding:", err)
        })
    }
  }

  return {
    user,
    isLoading,
    error,
    showOnboarding,
    onboardingComplete: handleOnboardingComplete,
  }
} 