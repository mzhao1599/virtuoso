import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Anonymous Supabase client for the /demo pages: no cookies, so the pages
 * can be cached and every read goes through the `anon` role's RLS.
 * Returns null when the environment is not configured (e.g. a CI build).
 */
export function createDemoClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
