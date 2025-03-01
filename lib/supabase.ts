import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for public operations (used in components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server operations (used in API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Database types
export type OnrampRequest = {
  id: string
  onramp_id: string
  user_address: string
  account_name: string
  virtual_account: string
  bank_name: string
  created_at: string
}

export type Offramp = {
  id: string
  offramp_id: string
  user_address: string
  bank_account: string
  created_at: string
}

export type Deposit = {
  id: string
  bank_reference: string
  user_address: string
  amount: number
  onramp_id: string
  created_at: string
}

export type Withdrawal = {
  id: string
  user_address: string
  amount: number
  offramp_id: string
  processed: boolean
  created_at: string
}

export type Bridge = {
  id: string
  user_address: string
  amount: number
  destination_chain_id: number
  processed: boolean
  created_at: string
}

