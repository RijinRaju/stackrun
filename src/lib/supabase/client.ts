"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let client: SupabaseClient | null | undefined;

/** Browser client (publishable key). Only used for auth; it never writes scores. */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  const env = supabaseEnv();
  client = env ? createBrowserClient(env.url, env.key) : null;
  return client;
}
