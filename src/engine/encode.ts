// Stack <-> short, human-readable URL string.
//
// Format: tool ids in phase order, joined by ".", with "_" for an empty phase.
//   github.github-actions._._.vercel.platform-deploy._.sentry
// Tool ids are kebab-case, so "." and "_" never clash with them, and every
// character is URL-safe (no escaping needed). Ids are used instead of indexes so
// links keep working when tools are added or reordered in tools.json.
import { PHASE_IDS, type Data, type Stack } from "./schema";

const SEP = ".";
const NONE = "_";
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function emptyStack(): Stack {
  return Object.fromEntries(PHASE_IDS.map((p) => [p, null])) as Stack;
}

export function encodeStack(stack: Stack): string {
  return PHASE_IDS.map((p) => stack[p] ?? NONE).join(SEP);
}

/**
 * Parse a string made by `encodeStack`. Returns null for anything malformed.
 * When `data` is passed, it also rejects unknown tools and tools in the wrong phase.
 */
export function decodeStack(encoded: string, data?: Data): Stack | null {
  if (typeof encoded !== "string" || encoded.length > 500) return null;
  const parts = encoded.trim().split(SEP);
  if (parts.length !== PHASE_IDS.length) return null;

  const stack = emptyStack();
  for (const [i, phase] of PHASE_IDS.entries()) {
    const part = parts[i]!;
    if (part === NONE) continue;
    if (!SLUG.test(part)) return null;
    if (data) {
      const tool = data.tools.find((t) => t.id === part);
      if (!tool || tool.phase !== phase) return null;
    }
    stack[phase] = part;
  }
  return stack;
}
