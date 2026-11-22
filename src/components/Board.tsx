"use client";
import { useEffect } from "react";
import type { Stack } from "@/engine";
import { phases } from "@/lib/catalog";
import { sharePath } from "@/lib/share";
import { useStack } from "@/store/useStack";
import { ChallengePicker } from "./ChallengePicker";
import { FlowCanvas, FlowList } from "./FlowCanvas";
import { ResultPanel } from "./ResultPanel";
import { RunButton } from "./RunButton";
import { PhaseColumn } from "./PhaseColumn";
import { ToolInfoDrawer } from "./ToolInfoDrawer";

export function Board({
  initialChallengeId,
  initialStack,
}: {
  initialChallengeId?: string;
  initialStack?: Stack | null;
}) {
  const clearStack = useStack((s) => s.clearStack);
  const toolCount = useStack((s) => Object.values(s.stack).filter(Boolean).length);

  // Load ?c= and ?s= once, then keep the URL in sync so the address bar is always shareable.
  useEffect(() => {
    useStack.getState().hydrate({ challengeId: initialChallengeId, stack: initialStack });
    return useStack.subscribe((s, prev) => {
      if (s.stack === prev.stack && s.challengeId === prev.challengeId) return;
      window.history.replaceState(null, "", sharePath("/", s.stack, s.challengeId));
    });
  }, [initialChallengeId, initialStack]);

  return (
    <div className="flex flex-col gap-6">
      <ChallengePicker />

      <section aria-label="Pick your tools">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">
            Build your stack{" "}
            <span className="text-sm font-normal text-zinc-500">· {toolCount} tools picked</span>
          </h2>
          <button
            type="button"
            onClick={clearStack}
            className="text-sm text-zinc-500 hover:text-zinc-200"
          >
            Clear
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {phases.map((p, i) => (
            <PhaseColumn key={p.id} phase={p} index={i} />
          ))}
        </div>
      </section>

      <section
        aria-label="Deploy"
        className="sticky bottom-0 z-10 -mx-4 border-t border-zinc-800 bg-zinc-950/90 px-4 py-4 backdrop-blur md:static md:mx-0 md:rounded-2xl md:border"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your flow</h2>
          <RunButton />
        </div>
        <FlowCanvas />
        <div className="max-h-[40vh] overflow-y-auto md:max-h-none md:overflow-visible">
          <FlowList />
        </div>
      </section>

      <ResultPanel />

      <ToolInfoDrawer />
    </div>
  );
}
