// Supabase config from env. Returns null when not configured, so the rest of the
// app (board, sharing) keeps working without a database.
// Accepts the new key names (publishable/secret) or the legacy ones (anon/service_role).

export function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export const isSupabaseConfigured = () => supabaseEnv() !== null;
