import { createClient } from '@supabase/supabase-js';

/**
 * The public anonymous key is intentionally browser-safe: access is constrained
 * by Supabase RLS. Returning null keeps the chart usable when the realtime
 * variables have not been configured yet.
 */
export function createRealtimeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
