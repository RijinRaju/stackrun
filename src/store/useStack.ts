"use client";
// Global UI state: the selected challenge, the stack, and the Run animation.
// The result always comes from the engine's evaluate(); nothing is scored here.
import { create } from "zustand";
import { emptyStack, evaluate, type PhaseId, type RunResult, type Stack } from "@/engine";
import { challengeById, data, DEFAULT_CHALLENGE_ID } from "@/lib/catalog";

/** ms between steps of the Run animation */
export const STEP_MS = 550;

export type RunPhase = "idle" | "running" | "done";

interface StackState {
  challengeId: string;
  stack: Stack;
  /** tool whose info drawer is open */
  infoToolId: string | null;

  run: RunPhase;
  result: RunResult | null;
  /** how many steps of the animation have been revealed (0–8) */
  revealed: number;

  setChallenge: (id: string) => void;
  /** load a challenge and/or stack in one go, e.g. from the URL */
  hydrate: (init: { challengeId?: string; stack?: Stack | null }) => void;
  selectTool: (phase: PhaseId, toolId: string | null) => void;
  clearStack: () => void;
  openInfo: (toolId: string | null) => void;
  startRun: () => void;
  /** skip the animation and show the result right away */
  finishRun: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;
const stopTimer = () => {
  if (timer) clearTimeout(timer);
  timer = undefined;
};

const resetRun = { run: "idle" as const, result: null, revealed: 0 };

export const useStack = create<StackState>()((set, get) => ({
  challengeId: DEFAULT_CHALLENGE_ID,
  stack: emptyStack(),
  infoToolId: null,
  ...resetRun,

  setChallenge: (id) => {
    if (!challengeById(id) || id === get().challengeId) return;
    stopTimer();
    set({ challengeId: id, ...resetRun });
  },

  hydrate: ({ challengeId, stack }) => {
    stopTimer();
    const valid = challengeById(challengeId) ? challengeId! : get().challengeId;
    set({ challengeId: valid, stack: stack ?? get().stack, ...resetRun });
  },

  selectTool: (phase, toolId) => {
    stopTimer();
    const current = get().stack[phase];
    // clicking the selected card again deselects it
    const next = current === toolId ? null : toolId;
    set({ stack: { ...get().stack, [phase]: next }, ...resetRun });
  },

  clearStack: () => {
    stopTimer();
    set({ stack: emptyStack(), ...resetRun });
  },

  openInfo: (toolId) => set({ infoToolId: toolId }),

  startRun: () => {
    stopTimer();
    const { stack, challengeId } = get();
    const result = evaluate(stack, challengeById(challengeId)!, data);
    set({ run: "running", result, revealed: 0 });

    const tick = () => {
      const { result, revealed } = get();
      if (!result) return;
      const step = result.steps[revealed];
      const next = revealed + 1;
      // after a failed step, the rest are "skipped": reveal them all at once
      if (step?.status === "fail" || next >= result.steps.length) {
        set({ revealed: result.steps.length, run: "done" });
        timer = undefined;
        return;
      }
      set({ revealed: next });
      timer = setTimeout(tick, STEP_MS);
    };
    timer = setTimeout(tick, STEP_MS);
  },

  finishRun: () => {
    stopTimer();
    const { result } = get();
    if (result) set({ revealed: result.steps.length, run: "done" });
  },
}));
