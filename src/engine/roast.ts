// Funny one-liners picked from the run result. A table of condition → line;
// the first matching entry wins, so order matters (most specific first).
// Pure and deterministic: no randomness, same input → same line.
import type { Challenge, Issue, Phase, Stack, Tool } from "./schema";

export interface RoastContext {
  stack: Stack;
  tools: Tool[];
  challenge: Challenge;
  passed: boolean;
  score: number;
  issues: Issue[];
  /** the phase where the run failed, if it did */
  failedPhase: Phase | null;
}

export interface Roast {
  id: string;
  when: (c: RoastContext) => boolean;
  line: (c: RoastContext) => string;
}

const has = (c: RoastContext, id: string) => c.tools.some((t) => t.id === id);
const errors = (c: RoastContext) => c.issues.filter((i) => i.severity === "error").length;

export const ROASTS: Roast[] = [
  {
    id: "many-errors",
    when: (c) => errors(c) >= 3,
    line: (c) => `${errors(c)} errors. This isn't a stack, it's a cry for help.`,
  },
  {
    id: "k8s-solo",
    when: (c) => c.challenge.scale === "solo" && has(c, "kubernetes"),
    line: () => "Kubernetes for a side project? Bold.",
  },
  {
    id: "too-many-tools-solo",
    when: (c) => c.challenge.scale === "solo" && c.tools.length >= 7,
    line: (c) =>
      `${c.tools.length} tools for 100 users. Your stack has more services than your app has users.`,
  },
  {
    id: "failed",
    when: (c) => !c.passed,
    line: (c) =>
      `Deployment broke at ${c.failedPhase?.name ?? "step one"}. Back to the whiteboard.`,
  },
  {
    id: "dotenv",
    when: (c) => has(c, "dotenv-file"),
    line: () => ".env file in production. Living dangerously, I see.",
  },
  {
    id: "vercel-minimal",
    when: (c) => c.stack.runtime === "vercel" && c.tools.length <= 2,
    line: () => "Push to main and go to sleep. Respect.",
  },
  {
    id: "chaos-full-house",
    when: (c) => c.challenge.tags.includes("chaos") && c.tools.length === 8,
    line: () => "All 8 phases filled and it still deploys. Chaos achieved.",
  },
  {
    id: "jenkins",
    when: (c) => has(c, "jenkins"),
    line: () => "Jenkins in 2026. Somewhere a Groovy script is very proud of you.",
  },
  {
    id: "great",
    when: (c) => c.score >= 90,
    line: () => "Clean. Boring. Perfect. Ops teams dream of this.",
  },
  {
    id: "good",
    when: (c) => c.score >= 70,
    line: () => "Solid stack. A few things to tidy, but it ships.",
  },
  {
    id: "default",
    when: () => true,
    line: () => "It deploys. That's the main thing, right?",
  },
];

export function pickRoast(ctx: RoastContext, roasts: Roast[] = ROASTS): string {
  const r = roasts.find((x) => x.when(ctx));
  return r ? r.line(ctx) : "";
}
