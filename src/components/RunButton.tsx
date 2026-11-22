"use client";
import { useStack } from "@/store/useStack";

export function RunButton() {
  const run = useStack((s) => s.run);
  const startRun = useStack((s) => s.startRun);
  const finishRun = useStack((s) => s.finishRun);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={startRun}
        disabled={run === "running"}
        className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
      >
        {run === "running" ? "Deploying…" : run === "done" ? "↻ Run again" : "▶ Run deploy"}
      </button>
      {run === "running" && (
        <button
          type="button"
          onClick={finishRun}
          className="text-sm text-zinc-500 hover:text-zinc-200"
        >
          Skip animation
        </button>
      )}
    </div>
  );
}
