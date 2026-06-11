import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase env vars not configured.");
    _supabase = createClient(url, key);
  }
  return _supabase;
}

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || (!serviceKey && !anonKey))
      throw new Error("Supabase env vars not configured.");
    // The admin client is meant to use the service-role key, which bypasses RLS.
    // Falling back to the anon key keeps the app running, but if RLS is ever
    // enabled, anon reads silently return empty results (HTTP 200, []), which
    // looks like "no data" with no error to debug. Make that degradation loud.
    if (!serviceKey) {
      console.warn(
        "[supabase] SUPABASE_SERVICE_ROLE_KEY is missing — admin client is falling back to the anon key. " +
          "Reads on RLS-protected tables may return 0 rows with no error. Set the service-role key in this environment."
      );
    }
    _supabaseAdmin = createClient(url, serviceKey ?? anonKey!);
  }
  return _supabaseAdmin;
}

export { getSupabase as supabase, getSupabaseAdmin as supabaseAdmin };
