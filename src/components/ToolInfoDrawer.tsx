"use client";
import { useEffect } from "react";
import { phaseById, toolById } from "@/lib/catalog";
import { useStack } from "@/store/useStack";
import { CostBadge, DifficultyDots } from "./ToolCard";
import { ToolLogo } from "./ToolLogo";

export function ToolInfoDrawer() {
  const infoToolId = useStack((s) => s.infoToolId);
  const openInfo = useStack((s) => s.openInfo);
  const selectTool = useStack((s) => s.selectTool);
  const selectedInPhase = useStack((s) => {
    const t = toolById(s.infoToolId);
    return t ? s.stack[t.phase] : null;
  });
  const tool = toolById(infoToolId);

  useEffect(() => {
    if (!tool) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openInfo(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, openInfo]);

  if (!tool) return null;
  const isSelected = selectedInPhase === tool.id;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={() => openInfo(null)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-info-title"
        className="relative flex h-full w-full max-w-sm flex-col gap-5 overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <ToolLogo tool={tool} size={48} />
          <div className="min-w-0 flex-1">
            <h2 id="tool-info-title" className="text-lg font-semibold text-zinc-50">
              {tool.name}
            </h2>
            <p className="text-sm text-zinc-500">{phaseById(tool.phase).name}</p>
          </div>
          <button
            type="button"
            onClick={() => openInfo(null)}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            ✕
          </button>
        </div>

        <p className="text-sm leading-relaxed text-zinc-300">{tool.description}</p>

        <div className="rounded-xl bg-zinc-900 p-4">
          <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Use it to</h3>
          <p className="mt-1 text-sm text-zinc-200">{tool.use}</p>
        </div>

        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-zinc-500">Cost</dt>
          <dd>
            <CostBadge cost={tool.cost} />
          </dd>
          <dt className="text-zinc-500">Difficulty</dt>
          <dd className="flex items-center gap-2">
            <DifficultyDots value={tool.difficulty} />
            <span className="text-zinc-400">{tool.difficulty}/5</span>
          </dd>
          <dt className="text-zinc-500">Hosting</dt>
          <dd className="text-zinc-200">{tool.selfHosted ? "You run it" : "Managed"}</dd>
        </dl>

        {tool.provides.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Provides
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tool.provides.map((p) => (
                <span
                  key={p}
                  className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto flex gap-2">
          <button
            type="button"
            onClick={() => {
              selectTool(tool.phase, tool.id);
              openInfo(null);
            }}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              isSelected
                ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                : "bg-violet-500 text-white hover:bg-violet-400"
            }`}
          >
            {isSelected ? "Remove from stack" : "Use this tool"}
          </button>
          <a
            href={tool.website}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Website ↗
          </a>
        </div>
      </aside>
    </div>
  );
}
