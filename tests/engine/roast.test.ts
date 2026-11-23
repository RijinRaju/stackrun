import { describe, expect, it } from "vitest";
import { emptyStack } from "@/engine/encode";
import { loadData } from "@/engine/load";
import {
  BURNS,
  HEADLINES,
  matchBurns,
  matchRoast,
  pickRoast,
  type RoastContext,
} from "@/engine/roast";
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

// The stack from the screenshot that started this: 8 heavy tools on a solo challenge.
const overkill: Partial<Stack> = {
  source: "azure-repos",
  ci: "buildkite",
  build: "docker",
  infra: "pulumi",
  runtime: "kubernetes",
  cd: "spinnaker",
  secrets: "vault",
  observe: "new-relic",
};

describe("headline roast", () => {
  it("roasts tool count before Kubernetes on a bloated solo stack", () => {
    const r = matchRoast(ctx(overkill));
    expect(r.id).toBe("too-many-tools-solo");
    expect(r.line).toMatch(/^8 tools for/);
  });

  it("roasts Kubernetes on a small solo stack", () => {
    expect(matchRoast(ctx({ source: "github", build: "docker", runtime: "kubernetes" })).id).toBe(
      "k8s-solo",
    );
  });

  it("respects a minimal Vercel stack", () => {
    expect(matchRoast(ctx({ source: "github", runtime: "vercel" })).id).toBe("vercel-minimal");
  });

  it("names the phase where the run failed", () => {
    const r = matchRoast(
      ctx(
        { source: "github", runtime: "vercel", cd: "argocd" },
        { passed: false, score: 0, failedPhase: data.phases.find((p) => p.id === "cd")! },
      ),
    );
    expect(r.id).toBe("failed");
    expect(r.line).toContain("Deploy / CD");
  });

  it("mocks paid tools on a $0 budget", () => {
    const r = matchRoast(ctx({ source: "github", runtime: "railway", observe: "datadog" }));
    expect(r.id).toBe("broke-on-paid");
    expect(r.line).toMatch(/2 paid tools/);
  });

  it("has a line for an empty stack and falls back by score", () => {
    expect(matchRoast(ctx({})).id).toBe("empty");
    expect(matchRoast(ctx({ source: "gitlab", runtime: "railway" }, { score: 50 })).id).toBe("meh");
    expect(matchRoast(ctx({ source: "gitlab", runtime: "railway" }, { score: 10 })).id).toBe(
      "default",
    );
  });
});

describe("burns", () => {
  it("adds up to 3 extra jabs at specific choices, in table order", () => {
    const burns = matchBurns(ctx(overkill));
    expect(burns.map((b) => b.id)).toEqual(["spinnaker", "vault-solo", "azure-repos"]);
  });

  it("calls out missing phases on bigger stacks", () => {
    const ids = matchBurns(ctx({ source: "github", build: "docker", runtime: "fly-io" })).map(
      (b) => b.id,
    );
    expect(ids).toEqual(["no-monitoring", "no-ci", "no-secrets"]);
  });

  it("leaves a clean minimal stack alone", () => {
    expect(matchBurns(ctx({ source: "github", runtime: "vercel" }))).toEqual([]);
  });
});

describe("determinism and variety", () => {
  it("gives the same stack the same roast every time", () => {
    const c = ctx(overkill);
    expect(pickRoast(c)).toBe(pickRoast(ctx(overkill)));
    expect(matchBurns(c)).toEqual(matchBurns(ctx(overkill)));
  });

  it("uses more than one variant across different stacks", () => {
    const runtimes = ["fly-io", "railway", "vm-nginx", "compose-vps", "aws-ecs", "kubernetes"];
    const lines = new Set<string>();
    for (const build of ["docker", "podman", "buildpacks", "nixpacks"]) {
      for (const runtime of runtimes) {
        const r = matchRoast(
          ctx(
            { source: "github", build, runtime },
            { passed: false, score: 0, failedPhase: data.phases[4]! },
          ),
        );
        lines.add(r.line);
      }
    }
    expect(lines.size).toBeGreaterThan(1);
  });

  it("has unique ids and no empty lines", () => {
    for (const table of [HEADLINES, BURNS]) {
      expect(new Set(table.map((r) => r.id)).size).toBe(table.length);
      for (const r of table) expect(r.lines.length).toBeGreaterThan(0);
    }
  });
});
