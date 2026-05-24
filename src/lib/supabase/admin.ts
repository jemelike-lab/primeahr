import { createClient } from '@supabase/supabase-js'

// Server-side admin client. Bypasses RLS via the service-role key.
// ONLY use in trusted server contexts (server components, server actions, route handlers).
// NEVER expose this client to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

