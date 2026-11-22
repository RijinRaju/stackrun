// The shareable "stack card": tools, score and roast in one image-friendly box.
// Used visibly on /s and off-screen for the Download PNG button.
import { forwardRef } from "react";
import type { Challenge, RunResult, Stack } from "@/engine";
import { phases, toolById } from "@/lib/catalog";
import { STATUS_BADGE, STATUS_ICON } from "./runStatus";
import { scoreColor } from "./ScoreBadge";
import { ToolLogo } from "./ToolLogo";

interface Props {
  stack: Stack;
  result: RunResult;
  challenge: Challenge;
  className?: string;
}

export const StackCard = forwardRef<HTMLDivElement, Props>(function StackCard(
  { stack, result, challenge, className = "" },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`flex flex-col gap-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 ${className}`}
      style={{ backgroundImage: "radial-gradient(circle at 100% 0%, #4c1d9533, transparent 55%)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xl font-black tracking-tight">
          Stack<span className="text-violet-400">Run</span>
        </span>
        <span className="truncate rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
          {challenge.title}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex flex-col items-center leading-none">
          <span
            className={`text-6xl font-black tabular-nums ${scoreColor(result.score, result.passed)}`}
          >
            {result.score}
          </span>
          <span
            className={`mt-2 text-[10px] font-bold tracking-widest uppercase ${
              result.passed ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {result.passed ? "Deployed" : "Failed"}
          </span>
        </div>
        <p className="text-lg leading-snug font-semibold text-zinc-50">“{result.roast}”</p>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {phases.map((phase, i) => {
          const tool = toolById(stack[phase.id]);
          const status = result.steps[i]?.status ?? "ok";
          return (
            <li
              key={phase.id}
              className={`flex items-center gap-2.5 rounded-xl bg-zinc-900 px-2.5 py-2 ${
                status === "skipped" ? "opacity-40" : ""
              }`}
            >
              <ToolLogo tool={tool} size={28} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] tracking-wide text-zinc-500 uppercase">
                  {phase.name}
                </div>
                <div
                  className={`truncate text-sm ${tool ? "text-zinc-100" : "text-zinc-500 italic"}`}
                >
                  {tool?.name ?? "None"}
                </div>
              </div>
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${STATUS_BADGE[status]}`}
              >
                {STATUS_ICON[status]}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-between text-xs text-zinc-500">
        <span>
          {result.stats.toolCount} tools · {result.stats.monthlyCostHint}
        </span>
        <span>Build yours → stackrun</span>
      </div>
    </div>
  );
});
