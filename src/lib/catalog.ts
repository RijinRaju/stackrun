// Read-only lookups over the validated data, for UI components.
// No scoring or rule logic lives here; that's all in src/engine.
import { loadData, type PhaseId, type Tool } from "@/engine";

export const data = loadData();
export const { phases, tools, challenges } = data;

const toolMap = new Map(tools.map((t) => [t.id, t]));
export const toolById = (id: string | null | undefined): Tool | undefined =>
  id ? toolMap.get(id) : undefined;

export const toolsInPhase = (phase: PhaseId): Tool[] => tools.filter((t) => t.phase === phase);

export const phaseById = (id: PhaseId) => phases.find((p) => p.id === id)!;

export const challengeById = (id: string | null | undefined) => challenges.find((c) => c.id === id);

export const DEFAULT_CHALLENGE_ID = challenges[0]!.id;
