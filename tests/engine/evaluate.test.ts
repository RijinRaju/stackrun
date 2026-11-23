import { describe, expect, it } from "vitest";
import { emptyStack } from "@/engine/encode";
import { evaluate } from "@/engine/evaluate";
import { loadData } from "@/engine/load";
import type { Stack } from "@/engine/schema";

const data = loadData();
const challenge = (id: string) => data.challenges.find((c) => c.id === id)!;
const solo = challenge("solo-zero-budget");
const startup = challenge("startup-10k-users");
const stack = (s: Partial<Stack>): Stack => ({ ...emptyStack(), ...s });
const run = (s: Partial<Stack>, c = solo) => evaluate(stack(s), c, data);
const ruleIds = (r: ReturnType<typeof run>) => r.issues.map((i) => i.ruleId);
const status = (r: ReturnType<typeof run>) => r.steps.map((s) => s.status);

const vercelSolo: Partial<Stack> = {
  source: "github",
  ci: "github-actions",
  runtime: "vercel",
  cd: "platform-deploy",
  secrets: "platform-env",
  observe: "sentry",
};

describe("evaluate: valid stacks", () => {
  it("a clean Vercel stack passes with every step ok", () => {
    const r = run(vercelSolo);
    expect(r.passed).toBe(true);
    expect(r.issues).toEqual([]);
    expect(status(r)).toEqual(Array(8).fill("ok"));
    expect(r.score).toBeGreaterThan(70);
    expect(r.stats.toolCount).toBe(6);
  });

  it("returns steps in phase order with the selected tool on each", () => {
    const r = run(vercelSolo);
    expect(r.steps.map((s) => s.phase)).toEqual(data.phases.map((p) => p.id));
    expect(r.steps[0]).toMatchObject({ phase: "source", tool: "github" });
    expect(r.steps[2]).toMatchObject({ phase: "build", tool: null, status: "ok" });
  });

  it("a full Kubernetes stack passes chaos mode and fills every phase", () => {
    const r = run(
      {
        source: "gitlab",
        ci: "gitlab-ci",
        build: "docker",
        infra: "terraform",
        runtime: "kubernetes",
        cd: "argocd",
        secrets: "vault",
        observe: "prometheus-grafana",
      },
      challenge("chaos-mode"),
    );
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
    expect(r.roast).toMatch(/chaos/i);
  });
});

describe("evaluate: rule types", () => {
  it("requires: Argo CD without Kubernetes fails at the CD step", () => {
    const r = run({ source: "github", runtime: "vercel", cd: "argocd" });
    expect(r.passed).toBe(false);
    expect(ruleIds(r)).toEqual(["argocd-needs-k8s"]);
    expect(r.steps.find((s) => s.phase === "cd")).toMatchObject({
      status: "fail",
      messages: ["Argo CD deploys to Kubernetes, but your runtime isn't Kubernetes."],
    });
  });

  it("requires: satisfied by a specific tool or by a capability", () => {
    expect(run({ source: "github", ci: "github-actions", runtime: "vercel" }).passed).toBe(true);
    expect(ruleIds(run({ source: "gitlab", ci: "github-actions", runtime: "vercel" }))).toEqual([
      "github-actions-needs-github",
    ]);
    // kubernetes needs the container-image capability; any build tool provides it
    expect(
      run({ source: "github", build: "podman", runtime: "kubernetes" }, startup).issues,
    ).not.toContainEqual(expect.objectContaining({ ruleId: "k8s-needs-image" }));
  });

  it("conflicts: reported at the later of the two phases", () => {
    const r = run({ source: "github", build: "docker", runtime: "vercel" });
    expect(ruleIds(r)).toEqual(["vercel-docker"]);
    expect(r.issues[0]).toMatchObject({ phase: "runtime", tool: "vercel", severity: "error" });
    expect(r.steps.find((s) => s.phase === "build")!.status).toBe("ok");
    expect(r.steps.find((s) => s.phase === "runtime")!.status).toBe("fail");
  });

  it("pairs_well: adds a bonus and a message, never an issue", () => {
    const r = run(vercelSolo);
    expect(r.bonuses.map((b) => b.ruleId)).toEqual(["github-actions-pair", "vercel-sentry-pair"]);
    expect(r.steps.find((s) => s.phase === "ci")!.messages).toContain(
      "GitHub + GitHub Actions: zero setup, CI lives next to your code.",
    );
  });

  it("overkill: warns for the challenge scale it targets only", () => {
    const k8s = { source: "github", build: "docker", runtime: "kubernetes" };
    const onSolo = run(k8s);
    expect(onSolo.passed).toBe(true);
    expect(ruleIds(onSolo)).toContain("k8s-overkill-solo");
    expect(onSolo.steps.find((s) => s.phase === "runtime")!.status).toBe("warn");
    expect(
      ruleIds(
        run({ ...k8s, ci: "github-actions", secrets: "doppler", observe: "datadog" }, startup),
      ),
    ).toEqual([]);
  });

  it("missing: challenge-specific missing phase can be an error", () => {
    const r = run({ source: "github", ci: "github-actions", runtime: "railway" }, startup);
    expect(r.passed).toBe(false);
    expect(ruleIds(r)).toEqual(["secrets-missing-payments", "observe-missing-startup"]);
    expect(r.issues.map((i) => i.severity)).toEqual(["error", "warning"]);
    // the same stack on the solo challenge has no such rule
    expect(ruleIds(run({ source: "github", ci: "github-actions", runtime: "railway" }))).toEqual(
      [],
    );
  });

  it("missing: source and runtime can never be empty", () => {
    const r = run({ source: "github" });
    expect(r.passed).toBe(false);
    expect(ruleIds(r)).toEqual(["required-runtime"]);
    expect(r.steps.find((s) => s.phase === "runtime")!.status).toBe("fail");
  });

  it("insecure: .env warns everywhere, platform env vars only under compliance", () => {
    const r = run({ source: "github", runtime: "vm-nginx", secrets: "dotenv-file" });
    expect(r.passed).toBe(true);
    expect(ruleIds(r)).toEqual(["dotenv-insecure"]);
    expect(r.burns.some((b) => b.includes(".env"))).toBe(true);

    expect(ruleIds(run(vercelSolo))).not.toContain("platform-env-compliance");
    expect(ruleIds(run(vercelSolo, challenge("enterprise-compliance")))).toContain(
      "platform-env-compliance",
    );
  });
});

describe("evaluate: run order", () => {
  it("stops at the first error and skips every later step", () => {
    const r = run({
      source: "gitlab",
      ci: "github-actions", // error: needs GitHub
      runtime: "vercel",
      cd: "argocd", // error too, but later
      observe: "sentry",
    });
    expect(status(r)).toEqual([
      "ok",
      "fail",
      "skipped",
      "skipped",
      "skipped",
      "skipped",
      "skipped",
      "skipped",
    ]);
    // skipped steps carry no messages, but all errors are still listed
    expect(r.steps.slice(2).every((s) => s.messages.length === 0)).toBe(true);
    expect(ruleIds(r)).toEqual(["github-actions-needs-github", "argocd-needs-k8s"]);
    expect(r.roast).toContain("CI (build + test)");
  });

  it("warnings never stop the run", () => {
    const r = run({ source: "github", ci: "jenkins", runtime: "vm-nginx", secrets: "dotenv-file" });
    expect(r.passed).toBe(true);
    expect(status(r)).not.toContain("skipped");
    expect(status(r).filter((s) => s === "warn")).toHaveLength(2);
  });

  it("a failed run scores 0", () => {
    const r = run({ source: "github", runtime: "vercel", cd: "helm" });
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
    expect(r.issues.map((i) => i.ruleId).sort()).toEqual(["helm-needs-k8s", "vercel-helm"]);
  });
});

describe("evaluate: scoring and determinism", () => {
  it("a simple stack beats an over-engineered one on the solo challenge", () => {
    const simple = run(vercelSolo);
    const heavy = run({
      source: "github",
      ci: "github-actions",
      build: "docker",
      infra: "terraform",
      runtime: "kubernetes",
      cd: "argocd",
      secrets: "vault",
      observe: "datadog",
    });
    expect(heavy.passed).toBe(true);
    expect(simple.score).toBeGreaterThan(heavy.score);
    expect(heavy.roast).toMatch(/^8 tools for/);
    expect(heavy.burns.length).toBeGreaterThan(0);
  });

  it("is deterministic: same stack + challenge gives an identical result", () => {
    for (const c of data.challenges) {
      const a = run(vercelSolo, c);
      const b = run(vercelSolo, c);
      expect(b).toEqual(a);
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    }
  });

  it("does not mutate its inputs", () => {
    const s = stack(vercelSolo);
    const before = JSON.stringify([s, solo, data]);
    run(vercelSolo);
    evaluate(s, solo, data);
    expect(JSON.stringify([s, solo, data])).toBe(before);
  });

  it("throws on unknown tools or tools in the wrong phase", () => {
    expect(() => run({ source: "github", runtime: "not-a-tool" })).toThrow(/unknown tool/);
    expect(() => run({ source: "vercel", runtime: "vercel" })).toThrow(/belongs in "runtime"/);
  });

  it("reports stats", () => {
    expect(run({ source: "github", runtime: "vercel" }).stats).toEqual({
      toolCount: 2,
      avgDifficulty: 1,
      monthlyCostHint: "$0 (free tiers)",
    });
    expect(
      run({ source: "github", build: "docker", runtime: "kubernetes" }).stats.monthlyCostHint,
    ).toBe("~$5–50/mo");
  });
});
