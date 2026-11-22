import { describe, expect, it } from "vitest";
import { checkReferences, loadData, validateData } from "@/engine/load";
import type { Data } from "@/engine/schema";

const clone = (d: Data): Data => structuredClone(d);

describe("data files", () => {
  it("bundled data loads and passes all checks", () => {
    const data = loadData();
    expect(data.phases).toHaveLength(8);
    expect(data.challenges.map((c) => c.id)).toEqual([
      "solo-zero-budget",
      "startup-10k-users",
      "enterprise-compliance",
      "chaos-mode",
    ]);
    expect(data.rules.length).toBeGreaterThanOrEqual(20);
    expect(checkReferences(data)).toEqual([]);
  });

  it("has at least one rule of every type", () => {
    const types = new Set(loadData().rules.map((r) => r.type));
    for (const t of ["requires", "conflicts", "pairs_well", "overkill", "missing", "insecure"]) {
      expect(types).toContain(t);
    }
  });

  it("fails when a rule references an unknown tool id", () => {
    const data = clone(loadData());
    data.rules.push({
      id: "bad-rule",
      type: "conflicts",
      tools: ["vercel", "not-a-real-tool"],
      severity: "error",
      message: "x",
    });
    expect(checkReferences(data)).toContain(
      'rules.json "bad-rule": unknown tool id "not-a-real-tool"',
    );
  });

  it("fails when a rule needs a capability no tool provides", () => {
    const data = clone(loadData());
    data.rules.push({
      id: "bad-cap",
      type: "requires",
      tool: "argocd",
      needs: { capabilities: ["teleportation"] },
      severity: "error",
      message: "x",
    });
    expect(checkReferences(data).join("\n")).toMatch(/no tool provides capability "teleportation"/);
  });

  it("rejects bad schema values with a readable path", () => {
    const data = clone(loadData());
    const res = validateData({
      ...data,
      tools: [{ ...data.tools[0], difficulty: 9 }, ...data.tools.slice(1)],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors[0]).toMatch(/^tools\.json \[0\.difficulty\]/);
  });

  it("rejects challenge weights that don't sum to 100", () => {
    const data = clone(loadData());
    data.challenges[0]!.weights.valid = 99;
    const res = validateData(data);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.join("\n")).toMatch(/weights must add up to 100/);
  });
});
