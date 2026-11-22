import { describe, expect, it } from "vitest";
import { loadData } from "@/engine/load";
import type { Challenge, Issue, Tool } from "@/engine/schema";
import {
  bestPracticeScore,
  computeScore,
  costScore,
  coverageScore,
  simplicityScore,
} from "@/engine/score";

const data = loadData();
const tools = (...ids: string[]): Tool[] => ids.map((id) => data.tools.find((t) => t.id === id)!);
const challenge = (id: string): Challenge => data.challenges.find((c) => c.id === id)!;
const issue = (type: Issue["type"], severity: Issue["severity"] = "warning"): Issue => ({
  ruleId: `test-${type}`,
  type,
  severity,
  phase: "runtime",
  tool: null,
  message: "",
});

const solo = challenge("solo-zero-budget");

describe("computeScore", () => {
  it("is 0 with an all-zero breakdown when the run failed", () => {
    const r = computeScore({
      passed: false,
      tools: tools("github", "vercel"),
      issues: [issue("requires", "error")],
      bonuses: [],
      challenge: solo,
    });
    expect(r.score).toBe(0);
    expect(Object.values(r.breakdown).every((v) => v === 0)).toBe(true);
  });

  it("gives full valid points and stays within 0–100", () => {
    const r = computeScore({
      passed: true,
      tools: tools("github", "vercel"),
      issues: [],
      bonuses: [],
      challenge: solo,
    });
    expect(r.breakdown.valid).toBe(solo.weights.valid);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("applies the challenge weights: breakdown points = sub-score × weight", () => {
    const r = computeScore({
      passed: true,
      tools: tools("github", "github-actions", "vercel", "sentry"),
      issues: [],
      bonuses: [],
      challenge: solo,
    });
    for (const k of Object.keys(solo.weights) as (keyof Challenge["weights"])[]) {
      expect(r.breakdown[k]).toBeCloseTo(r.subScores[k] * solo.weights[k], 1);
    }
    const sum = Object.values(r.breakdown).reduce((a, b) => a + b, 0);
    expect(Math.abs(r.score - sum)).toBeLessThanOrEqual(1);
  });

  it("changing weights changes the score for the same stack", () => {
    const input = { passed: true, tools: tools("github", "vercel"), issues: [], bonuses: [] };
    const a = computeScore({ ...input, challenge: solo });
    const allCoverage = {
      ...solo,
      weights: { valid: 0, simplicity: 0, cost: 0, coverage: 100, bestPractice: 0 },
    };
    const b = computeScore({ ...input, challenge: allCoverage });
    // github + vercel covers both must-haves but no nice-to-haves: 0.7 coverage
    expect(b.score).toBe(70);
    expect(a.score).not.toBe(b.score);
  });
});

describe("sub-scores", () => {
  it("simplicity: easier and fewer tools score higher, overkill is penalised", () => {
    const simple = simplicityScore(tools("github", "vercel"), [], "solo");
    const heavy = simplicityScore(
      tools(
        "gitlab",
        "jenkins",
        "docker",
        "terraform",
        "kubernetes",
        "argocd",
        "vault",
        "prometheus-grafana",
      ),
      [],
      "solo",
    );
    expect(simple).toBeGreaterThan(heavy);
    const withOverkill = simplicityScore(tools("github", "vercel"), [issue("overkill")], "solo");
    expect(withOverkill).toBeCloseTo(simple - 0.25);
  });

  it("cost: paid tools score 0 on a $0 budget but are fine with a big budget", () => {
    expect(costScore(tools("github", "vercel"), 0)).toBeCloseTo(0.8);
    expect(costScore(tools("kubernetes"), 0)).toBe(0);
    expect(costScore(tools("kubernetes"), 20000)).toBe(1);
  });

  it("coverage: must-haves count 70%, nice-to-haves 30%", () => {
    expect(coverageScore(tools("github", "vercel"), solo)).toBeCloseTo(0.7);
    expect(coverageScore(tools("github", "github-actions", "vercel", "sentry"), solo)).toBeCloseTo(
      1,
    );
    expect(coverageScore(tools("github"), solo)).toBeCloseTo(0.35);
  });

  it("best practice: rewards secrets, monitoring, CI and pairings; punishes insecure", () => {
    const good = bestPracticeScore(
      tools("github", "github-actions", "doppler", "sentry"),
      [],
      [{ ruleId: "x", tools: ["github", "github-actions"], bonus: 1, message: "" }],
    );
    expect(good).toBeCloseTo(0.9);
    const bad = bestPracticeScore(tools("github", "dotenv-file"), [issue("insecure")], []);
    expect(bad).toBe(0);
  });
});
