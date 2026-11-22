// View-only helpers for the Run animation: which status to *show* for a step
// right now. The statuses themselves come from the engine's RunResult.
import type { RunStep } from "@/engine";
import type { RunPhase } from "@/store/useStack";

export type DisplayStatus = RunStep["status"] | "idle" | "pending" | "running";

export function displayStatus(
  index: number,
  run: RunPhase,
  revealed: number,
  steps: RunStep[] | undefined,
): DisplayStatus {
  if (run === "idle" || !steps) return "idle";
  if (index < revealed) return steps[index]!.status;
  if (run === "running" && index === revealed) return "running";
  return "pending";
}

export const STATUS_ICON: Record<DisplayStatus, string> = {
  idle: "",
  pending: "",
  running: "…",
  ok: "✓",
  warn: "⚠",
  fail: "✗",
  skipped: "–",
};

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  idle: "Not run",
  pending: "Waiting",
  running: "Deploying",
  ok: "Passed",
  warn: "Passed with warnings",
  fail: "Failed",
  skipped: "Skipped",
};

/** border + background classes for a node/row */
export const STATUS_STYLE: Record<DisplayStatus, string> = {
  idle: "border-zinc-700 bg-zinc-900",
  pending: "border-zinc-800 bg-zinc-900/60 opacity-70",
  running: "border-violet-400 bg-violet-500/15 animate-pulse",
  ok: "border-emerald-500 bg-emerald-500/10",
  warn: "border-amber-400 bg-amber-400/10",
  fail: "border-rose-500 bg-rose-500/15",
  skipped: "border-zinc-800 bg-zinc-900/40 opacity-40 grayscale",
};

/** badge classes for the status icon */
export const STATUS_BADGE: Record<DisplayStatus, string> = {
  idle: "hidden",
  pending: "hidden",
  running: "bg-violet-500 text-white",
  ok: "bg-emerald-500 text-zinc-950",
  warn: "bg-amber-400 text-zinc-950",
  fail: "bg-rose-500 text-white",
  skipped: "bg-zinc-700 text-zinc-300",
};

/** stroke colour for the edge leading into a node */
export const EDGE_COLOR: Record<DisplayStatus, string> = {
  idle: "#3f3f46",
  pending: "#3f3f46",
  running: "#a78bfa",
  ok: "#10b981",
  warn: "#fbbf24",
  fail: "#f43f5e",
  skipped: "#27272a",
};
