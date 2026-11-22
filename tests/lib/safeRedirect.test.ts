import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safeRedirect";

describe("safeNextPath", () => {
  it("keeps same-site paths with their query", () => {
    expect(safeNextPath("/?c=chaos-mode&s=github._._._.vercel._._._")).toBe(
      "/?c=chaos-mode&s=github._._._.vercel._._._",
    );
    expect(safeNextPath("/leaderboard")).toBe("/leaderboard");
  });

  it("blocks open redirects and junk", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "evil",
      "",
      null,
      undefined,
    ]) {
      expect(safeNextPath(bad)).toBe("/");
    }
  });
});
