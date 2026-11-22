// Scoring formula (SPEC.md section 6). Pure and deterministic.
//
// Each category gets a sub-score between 0 and 1. Points = sub-score × weight,
// and the weights add up to 100, so the final score is 0–100.
import type { Bonus, Challenge, Cost, Issue, Scale, Tool, Weights } from "./schema";

export interface ScoreInput {
  passed: boolean;
  /** the selected tools (no nulls) */
  tools: Tool[];
  issues: Issue[];
  bonuses: Bonus[];
  challenge: Challenge;
}

export interface ScoreResult {
  score: number;
  /** points per category (sub-score × weight), rounded to 1 decimal */
  breakdown: Record<keyof Weights, number>;
  /** raw 0–1 sub-scores, handy for tests and UI bars */
  subScores: Record<keyof Weights, number>;
}

/** How many tools a stack of this size reasonably needs before it gets "complex". */
export const IDEAL_TOOL_COUNT: Record<Scale, number> = { solo: 3, startup: 5, enterprise: 8 };

export const OVERKILL_PENALTY = 0.25;
export const INSECURE_PENALTY = 0.3;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const KEYS = ["valid", "simplicity", "cost", "coverage", "bestPractice"] as const;

/** Simplicity: low average difficulty, not more tools than needed, no overkill. */
export function simplicityScore(tools: Tool[], issues: Issue[], scale: Scale): number {
  if (tools.length === 0) return 0;
  const avgDifficulty = tools.reduce((s, t) => s + t.difficulty, 0) / tools.length;
  const difficulty = 1 - (avgDifficulty - 1) / 4; // 1 → 1.0, 5 → 0.0
  const extra = Math.max(0, tools.length - IDEAL_TOOL_COUNT[scale]);
  const count = clamp01(1 - extra / 4);
  const overkill = issues.filter((i) => i.type === "overkill").length;
  return clamp01(0.5 * difficulty + 0.5 * count - OVERKILL_PENALTY * overkill);
}

/** How well a cost tier fits a monthly budget (USD). */
export function costFit(cost: Cost, budget: number): number {
  if (budget <= 0) return { free: 1, freemium: 0.8, paid: 0 }[cost];
  if (budget <= 1000) return { free: 1, freemium: 1, paid: 0.6 }[cost];
  return 1;
}

/** Cost: average budget fit of all selected tools. */
export function costScore(tools: Tool[], budget: number): number {
  if (tools.length === 0) return 0;
  return tools.reduce((s, t) => s + costFit(t.cost, budget), 0) / tools.length;
}

/** Coverage: must-have phases count 70%, nice-to-have 30%. */
export function coverageScore(tools: Tool[], challenge: Challenge): number {
  const filled = new Set(tools.map((t) => t.phase));
  const frac = (phases: string[]) =>
    phases.length === 0
      ? 1
      : phases.filter((p) => filled.has(p as Tool["phase"])).length / phases.length;
  if (challenge.niceToHave.length === 0) return frac(challenge.mustHave);
  return 0.7 * frac(challenge.mustHave) + 0.3 * frac(challenge.niceToHave);
}

/** Best practice: real secrets store, monitoring, CI, good pairings, minus insecure choices. */
export function bestPracticeScore(tools: Tool[], issues: Issue[], bonuses: Bonus[]): number {
  const caps = new Set(tools.flatMap((t) => t.provides));
  const phases = new Set(tools.map((t) => t.phase));
  let s = 0;
  if (caps.has("secret-store")) s += 0.3;
  if (phases.has("observe")) s += 0.3;
  if (phases.has("ci")) s += 0.2;
  s += Math.min(0.2, 0.1 * bonuses.reduce((sum, b) => sum + b.bonus, 0));
  s -= INSECURE_PENALTY * issues.filter((i) => i.type === "insecure").length;
  return clamp01(s);
}

export function computeScore(input: ScoreInput): ScoreResult {
  const { passed, tools, issues, bonuses, challenge } = input;
  const zero = { valid: 0, simplicity: 0, cost: 0, coverage: 0, bestPractice: 0 };
  if (!passed) return { score: 0, breakdown: { ...zero }, subScores: { ...zero } };

  const subScores: Record<keyof Weights, number> = {
    valid: 1,
    simplicity: simplicityScore(tools, issues, challenge.scale),
    cost: costScore(tools, challenge.budget),
    coverage: coverageScore(tools, challenge),
    bestPractice: bestPracticeScore(tools, issues, bonuses),
  };

  const breakdown = { ...zero };
  let total = 0;
  for (const k of KEYS) {
    const points = subScores[k] * challenge.weights[k];
    breakdown[k] = round1(points);
    total += points;
  }
  return { score: Math.round(total), breakdown, subScores };
}
