import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyStack } from "@/engine";
import { displayStatus } from "@/components/runStatus";
import { STEP_MS, useStack } from "@/store/useStack";

const s = () => useStack.getState();
const pick = (picks: Record<string, string>) => {
  for (const [phase, tool] of Object.entries(picks)) s().selectTool(phase as never, tool);
};

beforeEach(() => {
  vi.useFakeTimers();
  useStack.setState({ challengeId: "solo-zero-budget", stack: emptyStack(), infoToolId: null });
  s().clearStack();
});
afterEach(() => vi.useRealTimers());

describe("useStack", () => {
  it("selects, switches and deselects a tool in a phase", () => {
    s().selectTool("runtime", "vercel");
    expect(s().stack.runtime).toBe("vercel");
    s().selectTool("runtime", "railway");
    expect(s().stack.runtime).toBe("railway");
    s().selectTool("runtime", "railway");
    expect(s().stack.runtime).toBeNull();
  });

  it("reveals one step per tick for a passing stack", () => {
    pick({ source: "github", runtime: "vercel" });
    s().startRun();
    expect(s().run).toBe("running");
    expect(s().result?.passed).toBe(true);
    expect(s().revealed).toBe(0);
    vi.advanceTimersByTime(STEP_MS * 3);
    expect(s().revealed).toBe(3);
    vi.advanceTimersByTime(STEP_MS * 10);
    expect(s().run).toBe("done");
    expect(s().revealed).toBe(8);
  });

  it("stops at the failed step and reveals the skipped ones at once", () => {
    pick({ source: "gitlab", ci: "github-actions", runtime: "vercel" });
    s().startRun();
    vi.advanceTimersByTime(STEP_MS); // source revealed
    expect(s().run).toBe("running");
    vi.advanceTimersByTime(STEP_MS); // ci = fail → done
    expect(s().run).toBe("done");
    const statuses = s().result!.steps.map((_, i) =>
      displayStatus(i, s().run, s().revealed, s().result!.steps),
    );
    expect(statuses).toEqual(["ok", "fail", ...Array(6).fill("skipped")]);
  });

  it("shows the current step as running mid-animation", () => {
    pick({ source: "github", runtime: "vercel" });
    s().startRun();
    vi.advanceTimersByTime(STEP_MS * 2);
    const steps = s().result!.steps;
    expect(displayStatus(1, s().run, s().revealed, steps)).toBe("ok");
    expect(displayStatus(2, s().run, s().revealed, steps)).toBe("running");
    expect(displayStatus(3, s().run, s().revealed, steps)).toBe("pending");
  });

  it("finishRun skips the animation; editing the stack resets the run", () => {
    pick({ source: "github", runtime: "vercel" });
    s().startRun();
    s().finishRun();
    expect(s().run).toBe("done");
    expect(s().revealed).toBe(8);

    s().selectTool("observe", "sentry");
    expect(s().run).toBe("idle");
    expect(s().result).toBeNull();
    vi.advanceTimersByTime(STEP_MS * 10);
    expect(s().run).toBe("idle"); // no stray timer
  });

  it("changing challenge resets the run and ignores unknown ids", () => {
    pick({ source: "github", runtime: "vercel" });
    s().startRun();
    s().setChallenge("startup-10k-users");
    expect(s().challengeId).toBe("startup-10k-users");
    expect(s().run).toBe("idle");
    s().setChallenge("nope");
    expect(s().challengeId).toBe("startup-10k-users");
  });
});
