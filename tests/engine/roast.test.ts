import { describe, expect, it } from "vitest";
import { emptyStack } from "@/engine/encode";
import { loadData } from "@/engine/load";
import { pickRoast, ROASTS, type RoastContext } from "@/engine/roast";
import type { Stack } from "@/engine/schema";

const data = loadData();
const challenge = (id: string) => data.challenges.find((c) => c.id === id)!;

function ctx(partial: Partial<Stack>, extra: Partial<RoastContext> = {}): RoastContext {
  const stack = { ...emptyStack(), ...partial };
  const tools = Object.values(stack)
    .filter((id): id is string => id !== null)
    .map((id) => data.tools.find((t) => t.id === id)!);
  return {
    stack,
    tools,
    challenge: challenge("solo-zero-budget"),
    passed: true,
    score: 80,
    issues: [],
    failedPhase: null,
    ...extra,
  };
}

describe("pickRoast", () => {
  it("roasts Kubernetes on a solo challenge", () => {
    expect(pickRoast(ctx({ source: "github", runtime: "kubernetes" }))).toBe(
      "Kubernetes for a side project? Bold.",
    );
  });

  it("roasts tool count on a solo challenge", () => {
    const line = pickRoast(
      ctx({
        source: "github",
        ci: "github-actions",
        build: "docker",
        infra: "terraform",
        runtime: "fly-io",
        secrets: "doppler",
        observe: "sentry",
      }),
    );
    expect(line).toMatch(/^7 tools for 100 users/);
  });

  it("respects a minimal Vercel stack", () => {
    expect(pickRoast(ctx({ source: "github", runtime: "vercel" }))).toBe(
      "Push to main and go to sleep. Respect.",
    );
  });

  it("names the phase where the run failed", () => {
    const line = pickRoast(
      ctx(
        { source: "github", runtime: "vercel", cd: "argocd" },
        { passed: false, score: 0, failedPhase: data.phases.find((p) => p.id === "cd")! },
      ),
    );
    expect(line).toBe("Deployment broke at Deploy / CD. Back to the whiteboard.");
  });

  it("always returns a line, and the same line for the same input", () => {
    const c = ctx({ source: "gitlab", runtime: "railway" }, { score: 40 });
    expect(pickRoast(c)).toBe("It deploys. That's the main thing, right?");
    expect(pickRoast(c)).toBe(pickRoast(c));
    expect(new Set(ROASTS.map((r) => r.id)).size).toBe(ROASTS.length);
  });
});
