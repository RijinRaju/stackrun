// GitHub profile fields from a Supabase user. Usable on server and client.
type WithMetadata = { user_metadata?: Record<string, unknown> | null };

export function githubName(user: WithMetadata): string {
  const m = user.user_metadata ?? {};
  const name = m.user_name ?? m.preferred_username ?? m.name;
  return typeof name === "string" && name ? name.slice(0, 39) : "anonymous";
}

export function githubAvatar(user: WithMetadata): string | null {
  const url = user.user_metadata?.avatar_url;
  return typeof url === "string" && url.startsWith("https://") ? url : null;
}
