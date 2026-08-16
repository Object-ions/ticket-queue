import { createClient } from '@supabase/supabase-js'

// Vite only exposes env vars that start with VITE_ to browser code.
// These are read at build time from .env (local) or from Vercel's env settings (deployed).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Exported for the storage setup check, which probes a plain HTTP URL rather
// than going through the client library.
export const SUPABASE_URL = supabaseUrl

// The name of the Storage bucket that holds ticket screenshots. Defined once
// here so a typo can't drift between the upload code and the setup check.
export const SCREENSHOT_BUCKET = 'ticket-screenshots'

// `hasSupabaseConfig` lets the UI show a friendly "not configured yet" message
// instead of a cryptic crash while we're still in Phase 0/1 with placeholder values.
export const hasSupabaseConfig =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseAnonKey.includes('your-anon-key')

// One shared client for the whole app. Import this everywhere; never call
// createClient again, or you'd end up with two clients fighting over the same
// auth session in localStorage.
export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
