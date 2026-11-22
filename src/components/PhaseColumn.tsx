"use client";
import type { Phase } from "@/engine";
import { toolsInPhase } from "@/lib/catalog";
import { useStack } from "@/store/useStack";
import { ToolCard } from "./ToolCard";

export function PhaseColumn({ phase, index }: { phase: Phase; index: number }) {
  const selected = useStack((s) => s.stack[phase.id]);
  const selectTool = useStack((s) => s.selectTool);
  const tools = toolsInPhase(phase.id);

  return (
    <section
      aria-labelledby={`phase-${phase.id}`}
      className="flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3"
    >
      <header className="mb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
            {index + 1}
          </span>
          <h2 id={`phase-${phase.id}`} className="text-sm font-semibold text-zinc-100">
            {phase.name}
          </h2>
          {!phase.allowNone && (
            <span className="ml-auto text-[10px] font-medium tracking-wide text-rose-300/80 uppercase">
              required
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-snug text-zinc-500">{phase.description}</p>
      </header>

      <div className="flex flex-col gap-1.5">
        {tools.map((t) => (
          <ToolCard key={t.id} tool={t} selected={selected === t.id} />
        ))}
        {phase.allowNone && (
          <button
            type="button"
            onClick={() => selectTool(phase.id, null)}
            aria-pressed={selected === null}
            className={`rounded-xl border border-dashed px-3 py-2 text-left text-sm transition ${
              selected === null
                ? "border-zinc-500 bg-zinc-800/60 text-zinc-200"
                : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
            }`}
          >
            None
          </button>
        )}
      </div>
    </section>
  );
}
