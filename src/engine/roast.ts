// Roasts: one headline about the whole run, plus up to 3 "burns" aimed at
// specific choices. Each entry has a few variants; which one you get depends
// on a hash of the stack + challenge, never randomness. So the same stack
// always gets the same roast (the board, /s and the OG image all match),
// but different stacks hear different jokes.
import { encodeStack } from "./encode";
import type { Challenge, Issue, Phase, PhaseId, Stack, Tool } from "./schema";

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

type Line = string | ((c: RoastContext) => string);

export interface Roast {
  id: string;
  when: (c: RoastContext) => boolean;
  lines: Line[];
}

export interface PickedRoast {
  id: string;
  line: string;
}

// ── helpers ────────────────────────────────────────────────────────────────

const has = (c: RoastContext, id: string) => c.tools.some((t) => t.id === id);
const picked = (c: RoastContext, phase: PhaseId) => c.stack[phase] !== null;
const errors = (c: RoastContext) => c.issues.filter((i) => i.severity === "error").length;
const paid = (c: RoastContext) => c.tools.filter((t) => t.cost === "paid").length;
const n = (c: RoastContext) => c.tools.length;
const solo = (c: RoastContext) => c.challenge.scale === "solo";
const avgDifficulty = (c: RoastContext) =>
  n(c) ? c.tools.reduce((s, t) => s + t.difficulty, 0) / n(c) : 0;
const failedAt = (c: RoastContext) => c.failedPhase?.name ?? "step one";

/** FNV-1a: tiny, stable string hash. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function render(r: Roast, c: RoastContext): string {
  const seed = hash(`${encodeStack(c.stack)}|${c.challenge.id}|${r.id}`);
  const line = r.lines[seed % r.lines.length]!;
  return typeof line === "function" ? line(c) : line;
}

// ── headlines: first match wins, so most specific first ────────────────────

export const HEADLINES: Roast[] = [
  {
    id: "empty",
    when: (c) => n(c) === 0,
    lines: [
      "Zero tools. Technically the most secure deploy in history.",
      "You pressed Run on nothing. Bold. Nothing can break if nothing exists.",
    ],
  },
  {
    id: "many-errors",
    when: (c) => errors(c) >= 3,
    lines: [
      (c) => `${errors(c)} errors. This isn't a pipeline, it's a crime scene.`,
      (c) => `${errors(c)} errors. Even the CI quietly logged off and went home.`,
      (c) => `${errors(c)} errors. Your stack doesn't need DevOps, it needs an exorcist.`,
    ],
  },
  {
    id: "no-runtime",
    when: (c) => !picked(c, "runtime") && picked(c, "source"),
    lines: [
      "No runtime. A beautifully version-controlled app that lives nowhere.",
      "You picked everything except somewhere to actually run it. Very cloud-native. Very homeless.",
    ],
  },
  {
    id: "failed",
    when: (c) => !c.passed,
    lines: [
      (c) => `Deployment died at ${failedAt(c)}. The rest of your pipeline never even met it.`,
      (c) => `It broke at ${failedAt(c)}. Somewhere, a pager just went off.`,
      (c) => `Failed at ${failedAt(c)}. Have you tried turning your architecture off and on again?`,
      (c) => `${failedAt(c)} said no. Back to the whiteboard.`,
    ],
  },
  {
    id: "chaos-full-house",
    when: (c) => c.challenge.tags.includes("chaos") && n(c) === 8,
    lines: [
      "All 8 phases filled and it still deploys. Chaos achieved.",
      "8 tools, 0 errors. You don't fear chaos. You are the chaos.",
    ],
  },
  {
    id: "too-many-tools-solo",
    when: (c) => solo(c) && n(c) >= 7,
    lines: [
      (c) =>
        `${n(c)} tools for 100 users. That's one tool per ${Math.round(100 / n(c))} users. Very personal service.`,
      (c) =>
        `${n(c)} tools for a side project. Your stack has more moving parts than your app has features.`,
      (c) =>
        `${n(c)} tools for 100 users. You're not shipping an app, you're running a small cloud provider.`,
    ],
  },
  {
    id: "k8s-solo",
    when: (c) => solo(c) && has(c, "kubernetes"),
    lines: [
      "Kubernetes for a side project? 100 users and 3 replicas of anxiety.",
      "Kubernetes for 100 users. Somewhere a YAML file is laughing at you.",
      "Kubernetes for a solo project. Hope you enjoy being on call for yourself.",
    ],
  },
  {
    id: "broke-on-paid",
    when: (c) => c.challenge.budget === 0 && paid(c) >= 2,
    lines: [
      (c) =>
        `$0 budget, ${paid(c)} paid tools. Your credit card is about to roast you harder than I can.`,
      (c) =>
        `Budget: $0. Paid tools: ${paid(c)}. Bold of you to assume the free trial lasts forever.`,
    ],
  },
  {
    id: "vercel-minimal",
    when: (c) => c.stack.runtime === "vercel" && n(c) <= 2,
    lines: [
      "Push to main and go to sleep. Respect.",
      "Two tools. While everyone else writes YAML, you've already shipped.",
    ],
  },
  {
    id: "perfect",
    when: (c) => c.score === 100,
    lines: [
      "100/100. Suspiciously perfect. Did you read the source code?",
      "Perfect score. Nothing to roast. I'm honestly a little upset.",
    ],
  },
  {
    id: "great",
    when: (c) => c.score >= 90,
    lines: [
      "Clean. Boring. Perfect. The ops team wants to frame this.",
      "So sensible it's almost annoying. Fine. You win.",
    ],
  },
  {
    id: "good",
    when: (c) => c.score >= 70,
    lines: [
      "Solid stack. A few things to tidy, but it ships.",
      "Not bad. Not great. Very 'works fine on Tuesdays'.",
    ],
  },
  {
    id: "meh",
    when: (c) => c.score >= 40,
    lines: [
      "It deploys. Your future self will have questions.",
      "It runs, like a car held together with duct tape and optimism.",
    ],
  },
  {
    id: "default",
    when: () => true,
    lines: ["Technically it deploys. Technically.", "It passed, the way a C- passes."],
  },
];

// ── burns: every match counts, in this order, max 3 ───────────────────────

export const BURNS: Roast[] = [
  {
    id: "dotenv",
    when: (c) => has(c, "dotenv-file"),
    lines: [
      '.env file in production: one "git add ." away from being famous on Hacker News.',
      '.env on the server. Your secrets are a "cat" command away from a career change.',
    ],
  },
  {
    id: "spinnaker",
    when: (c) => has(c, "spinnaker") && c.challenge.scale !== "enterprise",
    lines: [
      "Spinnaker: Netflix uses it. You are not Netflix.",
      "Spinnaker for this? Your release train has one passenger.",
    ],
  },
  {
    id: "vault-solo",
    when: (c) => has(c, "vault") && solo(c),
    lines: [
      "HashiCorp Vault to guard one Stripe test key. Fort Knox for a sandwich.",
      "Vault for a side project. Enjoy unsealing it every time your $5 VPS reboots.",
    ],
  },
  {
    id: "k8s-no-cd",
    when: (c) => has(c, "kubernetes") && !picked(c, "cd"),
    lines: [
      'Kubernetes with no CD. So you "kubectl apply" by hand, like an animal.',
      "Kubernetes and no deploy tool. Bold to trust your own copy-paste in production.",
    ],
  },
  {
    id: "datadog-cheap",
    when: (c) => has(c, "datadog") && c.challenge.budget <= 500,
    lines: [
      "Datadog: the only part of your stack guaranteed to scale (the invoice).",
      "Datadog on this budget. Your monitoring will cost more than the thing it monitors.",
    ],
  },
  {
    id: "jenkins",
    when: (c) => has(c, "jenkins"),
    lines: [
      "Jenkins: because nothing says 2026 like debugging Groovy at 2am.",
      "Jenkins. 1,800 plugins and you'll still need one more.",
    ],
  },
  {
    id: "azure-repos",
    when: (c) => has(c, "azure-repos"),
    lines: [
      "Azure Repos. Someone in procurement is very proud of you.",
      "Azure Repos. Nobody has ever chosen this. It was chosen for you.",
    ],
  },
  {
    id: "bitbucket",
    when: (c) => has(c, "bitbucket"),
    lines: ["Bitbucket in 2026. Blink twice if Jira is holding you hostage."],
  },
  {
    id: "gitea",
    when: (c) => has(c, "gitea"),
    lines: ["Self-hosted Gitea. GitHub was right there, but sure, own your destiny."],
  },
  {
    id: "cloudformation",
    when: (c) => has(c, "cloudformation"),
    lines: ["CloudFormation: YAML so long it has chapters and a plot twist."],
  },
  {
    id: "iac-for-vercel",
    when: (c) => c.stack.runtime === "vercel" && picked(c, "infra"),
    lines: ["Infrastructure-as-code for Vercel. You wrote a program to click one button."],
  },
  {
    id: "prometheus-solo",
    when: (c) => has(c, "prometheus-grafana") && solo(c),
    lines: [
      "Self-hosted Prometheus + Grafana: dashboards about the server running your dashboards.",
    ],
  },
  {
    id: "buildkite-solo",
    when: (c) => has(c, "buildkite") && solo(c),
    lines: ["Buildkite for one developer. You and your build agents could start a book club."],
  },
  {
    id: "vm-nginx",
    when: (c) => has(c, "vm-nginx"),
    lines: ["One VM and Nginx. Old school. I hope you named the server after a Greek god."],
  },
  {
    id: "hard-mode",
    when: (c) => avgDifficulty(c) >= 3.5,
    lines: [
      (c) =>
        `Average difficulty ${avgDifficulty(c).toFixed(1)}/5. You picked hard mode and called it architecture.`,
    ],
  },
  {
    id: "no-monitoring",
    when: (c) => n(c) >= 3 && !picked(c, "observe"),
    lines: [
      "No monitoring. Your users are your monitoring.",
      "No monitoring. You'll find out it's down from a tweet.",
    ],
  },
  {
    id: "no-ci",
    when: (c) => n(c) >= 3 && !picked(c, "ci"),
    lines: [
      "No CI. You test in production, like a true legend.",
      "No CI. 'It worked on my machine' is now your entire QA strategy.",
    ],
  },
  {
    id: "no-secrets",
    when: (c) => n(c) >= 3 && !picked(c, "secrets"),
    lines: ["No secrets management. The API keys are... somewhere. Probably in Slack."],
  },
];

// ── pickers ────────────────────────────────────────────────────────────────

export function matchRoast(ctx: RoastContext, roasts: Roast[] = HEADLINES): PickedRoast {
  const r = roasts.find((x) => x.when(ctx));
  return r ? { id: r.id, line: render(r, ctx) } : { id: "none", line: "" };
}

export function pickRoast(ctx: RoastContext): string {
  return matchRoast(ctx).line;
}

export function matchBurns(ctx: RoastContext, max = 3, burns: Roast[] = BURNS): PickedRoast[] {
  return burns
    .filter((b) => b.when(ctx))
    .slice(0, max)
    .map((b) => ({ id: b.id, line: render(b, ctx) }));
}

export function pickBurns(ctx: RoastContext, max = 3): string[] {
  return matchBurns(ctx, max).map((b) => b.line);
}
