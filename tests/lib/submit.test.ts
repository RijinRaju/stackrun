import { describe, expect, it } from "vitest";
import { emptyStack, evaluate, loadData } from "@/engine";
import { prepareSubmission } from "@/lib/submit";

const data = loadData();
const solo = data.challenges.find((c) => c.id === "solo-zero-budget")!;
const good = {
  ...emptyStack(),
  source: "github",
  ci: "github-actions",
  runtime: "vercel",
  observe: "sentry",
};

describe("prepareSubmission", () => {
  it("computes the score on the server for a passing stack", () => {
    const r = prepareSubmission({ challengeId: solo.id, stack: good }, data);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const expected = evaluate(good, solo, data);
    expect(r.row).toEqual({
      challenge_id: solo.id,
      stack: good,
      stack_hash: "github.github-actions._._.vercel._._.sentry",
      score: expected.score,
      tool_count: 4,
    });
  });

  it("rejects a body that tries to send its own score", () => {
    const r = prepareSubmission({ challengeId: solo.id, stack: good, score: 100 }, data);
    expect(r).toMatchObject({ ok: false, status: 400 });
    if (!r.ok) expect(r.details!.join()).toMatch(/score/);
  });

  it("rejects extra fields inside the stack and missing phases", () => {
    expect(
      prepareSubmission({ challengeId: solo.id, stack: { ...good, bonus: "x" } }, data),
    ).toMatchObject({ ok: false, status: 400 });
    const partial: Record<string, string | null> = { ...good };
    delete partial.observe;
    expect(prepareSubmission({ challengeId: solo.id, stack: partial }, data)).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("rejects unknown challenges, unknown tools and tools in the wrong phase", () => {
    expect(prepareSubmission({ challengeId: "nope", stack: good }, data)).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(
      prepareSubmission({ challengeId: solo.id, stack: { ...good, runtime: "heroku" } }, data),
    ).toMatchObject({ ok: false, status: 400, error: "Invalid stack" });
    expect(
      prepareSubmission({ challengeId: solo.id, stack: { ...good, source: "vercel" } }, data),
    ).toMatchObject({ ok: false, status: 400 });
  });

  it("refuses stacks that fail to deploy", () => {
    const r = prepareSubmission({ challengeId: solo.id, stack: { ...good, cd: "argocd" } }, data);
    expect(r).toMatchObject({ ok: false, status: 422 });
    if (!r.ok)
      expect(r.details).toContain(
        "Argo CD deploys to Kubernetes, but your runtime isn't Kubernetes.",
      );
  });

  it("rejects non-object bodies", () => {
    for (const body of [null, "x", 42, [], {}]) {
      expect(prepareSubmission(body, data)).toMatchObject({ ok: false, status: 400 });
    }
  });
});
