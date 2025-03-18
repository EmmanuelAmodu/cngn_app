"use client"

import UserOnboardingForm from "@/components/user-onboarding-form"
import { useUser } from "@/hooks/use-user"
import { useAccount } from "wagmi"

export function ClientOnboarding() {
  const { showOnboarding, onboardingComplete } = useUser()
  const { address } = useAccount()

  if (!address) return null

  return (
    <UserOnboardingForm
      userAddress={address}
      isOpen={showOnboarding}
      onComplete={onboardingComplete}
    />
  )
} 