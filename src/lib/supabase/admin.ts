import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Server-only client with the secret (service-role) key. Bypasses RLS, so it is
 * the ONLY way rows get written. Never import this from client code.
 */
export function createSupabaseAdmin() {
  const env = supabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !secret) return null;
  return createClient(env.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
