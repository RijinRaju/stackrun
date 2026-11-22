import { describe, expect, it } from "vitest";
import { emptyStack } from "@/engine";
import { parseShare, sharePath, shareQuery } from "@/lib/share";

const stack = { ...emptyStack(), source: "github", runtime: "vercel", observe: "sentry" };

describe("share links", () => {
  it("builds a readable /s link with challenge and stack", () => {
    expect(sharePath("/s", stack, "solo-zero-budget")).toBe(
      "/s?c=solo-zero-budget&s=github._._._.vercel._._.sentry",
    );
  });

  it("leaves s out for an empty stack", () => {
    expect(shareQuery(emptyStack(), "chaos-mode")).toBe("c=chaos-mode");
  });

  it("round-trips through URLSearchParams", () => {
    const q = new URLSearchParams(shareQuery(stack, "startup-10k-users"));
    const parsed = parseShare({ c: q.get("c") ?? undefined, s: q.get("s") ?? undefined });
    expect(parsed.challenge.id).toBe("startup-10k-users");
    expect(parsed.stack).toEqual(stack);
  });

  it("falls back to the default challenge and rejects bad stacks", () => {
    const parsed = parseShare({ c: "nope", s: "not-a-tool._._._.vercel._._._" });
    expect(parsed.challenge.id).toBe("solo-zero-budget");
    expect(parsed.stack).toBeNull();
    expect(parseShare({}).stack).toBeNull();
  });

  it("uses the first value when a param is repeated", () => {
    expect(parseShare({ c: ["chaos-mode", "solo-zero-budget"] }).challenge.id).toBe("chaos-mode");
  });
});
