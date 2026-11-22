// Share URLs: /s?c=<challenge>&s=<encoded stack>. Pure, no React.
// The challenge is part of the link because the score depends on it.
import { decodeStack, encodeStack, type Challenge, type Stack } from "@/engine";
import { challengeById, data, DEFAULT_CHALLENGE_ID } from "./catalog";

type Param = string | string[] | undefined;
const first = (p: Param) => (Array.isArray(p) ? p[0] : p);

export const isEmptyStack = (stack: Stack) => Object.values(stack).every((v) => v === null);

/** "c=solo-zero-budget&s=github._._._.vercel._._._" (s left out for an empty stack) */
export function shareQuery(stack: Stack, challengeId: string): string {
  const q = new URLSearchParams({ c: challengeId });
  if (!isEmptyStack(stack)) q.set("s", encodeStack(stack));
  // the encoding is already URL-safe; keep it readable instead of %-escaping
  return q.toString().replace(/%2E/gi, ".");
}

export function sharePath(base: "/" | "/s", stack: Stack, challengeId: string): string {
  return `${base}?${shareQuery(stack, challengeId)}`;
}

/** Parse ?c= and ?s=. Unknown challenge → default; bad stack → null. */
export function parseShare(params: { c?: Param; s?: Param }): {
  challenge: Challenge;
  stack: Stack | null;
} {
  const challenge = challengeById(first(params.c)) ?? challengeById(DEFAULT_CHALLENGE_ID)!;
  const s = first(params.s);
  return { challenge, stack: s ? decodeStack(s, data) : null };
}

/** Absolute site URL for links in metadata and OG images. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
