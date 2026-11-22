"use client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "./client";

export type UserState =
  | { status: "disabled" }
  | { status: "loading" }
  | { status: "anon" }
  | { status: "in"; user: User };

/** Current user in the browser. "disabled" when Supabase isn't configured. */
export function useUser(): UserState {
  const [state, setState] = useState<UserState>(() =>
    getSupabaseBrowser() ? { status: "loading" } : { status: "disabled" },
  );

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const apply = (user: User | null) =>
      setState(user ? { status: "in", user } : { status: "anon" });
    supabase.auth.getUser().then(({ data }) => apply(data.user));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => apply(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}

export async function signInWithGitHub() {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  const next = window.location.pathname + window.location.search;
  await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
}

export async function signOut() {
  await getSupabaseBrowser()?.auth.signOut();
}

export function githubName(user: User): string {
  const m = user.user_metadata as Record<string, unknown>;
  return String(m.user_name ?? m.preferred_username ?? m.name ?? "you");
}

export function githubAvatar(user: User): string | null {
  const m = user.user_metadata as Record<string, unknown>;
  return typeof m.avatar_url === "string" ? m.avatar_url : null;
}
