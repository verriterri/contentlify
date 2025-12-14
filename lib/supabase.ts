import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Helper functions for Supabase API keys (new format only)
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }
  return url
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable')
  }
  return key
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY
}

const supabaseUrl = getSupabaseUrl()
const supabaseAnonKey = getSupabaseAnonKey()

// Browser client for client components
// createBrowserClient handles cookies automatically in browser
// Only create client if we're in browser (not SSR)
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : (() => {
      // Fallback for SSR - should not be used in client components
      return createClient(supabaseUrl, supabaseAnonKey)
    })()

// Legacy client for backwards compatibility (use supabase instead)
export const createClientOld = () => createClient(supabaseUrl, supabaseAnonKey)

// Server-side client for admin operations (use service role key if needed)
export const createServerClient = () => {
  const serviceRoleKey = getSupabaseServiceRoleKey()
  
  if (!serviceRoleKey) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

