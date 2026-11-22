"use client";
import type { Cost, Tool } from "@/engine";
import { useStack } from "@/store/useStack";
import { ToolLogo } from "./ToolLogo";

const COST_STYLE: Record<Cost, string> = {
  free: "bg-emerald-500/15 text-emerald-300",
  freemium: "bg-sky-500/15 text-sky-300",
  paid: "bg-amber-500/15 text-amber-300",
};

export function CostBadge({ cost }: { cost: Cost }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${COST_STYLE[cost]}`}>
      {cost}
    </span>
  );
}

export function DifficultyDots({ value }: { value: number }) {
  return (
    <span
      className="flex gap-0.5"
      aria-label={`Difficulty ${value} of 5`}
      title={`Difficulty ${value}/5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`size-1.5 rounded-full ${i <= value ? "bg-violet-400" : "bg-zinc-700"}`}
        />
      ))}
    </span>
  );
}

export function ToolCard({ tool, selected }: { tool: Tool; selected: boolean }) {
  const selectTool = useStack((s) => s.selectTool);
  const openInfo = useStack((s) => s.openInfo);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => selectTool(tool.phase, tool.id)}
        aria-pressed={selected}
        className={`flex w-full items-center gap-2.5 rounded-xl border p-2 pr-8 text-left transition ${
          selected
            ? "border-violet-400 bg-violet-500/15 shadow-[0_0_0_1px] shadow-violet-400/40"
            : "border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/70"
        }`}
      >
        <ToolLogo tool={tool} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-100">{tool.name}</span>
          <span className="mt-1 flex items-center gap-2">
            <CostBadge cost={tool.cost} />
            <DifficultyDots value={tool.difficulty} />
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => openInfo(tool.id)}
        aria-label={`About ${tool.name}`}
        className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full text-xs text-zinc-500 hover:bg-zinc-700 hover:text-zinc-100"
      >
        ⓘ
      </button>
    </div>
  );
}
