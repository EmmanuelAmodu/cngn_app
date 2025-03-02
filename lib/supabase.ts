import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error("Missing Supabase URL, public key, or service key")
}

// Client for public operations (used in components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server operations (used in API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
