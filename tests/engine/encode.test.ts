import { describe, expect, it } from "vitest";
import { decodeStack, emptyStack, encodeStack } from "@/engine/encode";
import { loadData } from "@/engine/load";
import type { Stack } from "@/engine/schema";

const data = loadData();

const vercelStack: Stack = {
  ...emptyStack(),
  source: "github",
  ci: "github-actions",
  runtime: "vercel",
  cd: "platform-deploy",
  observe: "sentry",
};

describe("encodeStack / decodeStack", () => {
  it("encodes to a readable, URL-safe string", () => {
    const s = encodeStack(vercelStack);
    expect(s).toBe("github.github-actions._._.vercel.platform-deploy._.sentry");
    expect(encodeURIComponent(s)).toBe(s);
  });

  it("round-trips an empty stack", () => {
    const s = encodeStack(emptyStack());
    expect(s).toBe("_._._._._._._._");
    expect(decodeStack(s)).toEqual(emptyStack());
  });

  it("round-trips every tool in every phase", () => {
    for (const tool of data.tools) {
      const stack = { ...emptyStack(), [tool.phase]: tool.id };
      expect(decodeStack(encodeStack(stack), data)).toEqual(stack);
    }
  });

  it("round-trips a full stack with data validation", () => {
    const full: Stack = {
      source: "gitlab",
      ci: "gitlab-ci",
      build: "docker",
      infra: "terraform",
      runtime: "kubernetes",
      cd: "argocd",
      secrets: "vault",
      observe: "prometheus-grafana",
    };
    expect(decodeStack(encodeStack(full), data)).toEqual(full);
  });

  it("rejects malformed strings", () => {
    for (const bad of [
      "",
      "github",
      "a.b.c",
      "_._._._._._._._._",
      "GitHub._._._.vercel._._._",
      "a b._._._._._._._",
    ]) {
      expect(decodeStack(bad)).toBeNull();
    }
  });

  it("rejects unknown tools and tools in the wrong phase when given data", () => {
    expect(decodeStack("nope._._._.vercel._._._", data)).toBeNull();
    // vercel is a runtime, not a source
    expect(decodeStack("vercel._._._.vercel._._._", data)).toBeNull();
    // without data it only checks the shape
    expect(decodeStack("nope._._._.vercel._._._")).not.toBeNull();
  });
});
