// Pure validation + scoring for leaderboard submissions. No DB, so it's unit-tested.
// The client sends ONLY { challengeId, stack }. The score is always computed here
// by the engine; a body with any other field (e.g. "score") is rejected.
import { z } from "zod";
import {
  checkStack,
  encodeStack,
  evaluate,
  StackSchema,
  type Challenge,
  type Data,
  type RunResult,
  type Stack,
} from "@/engine";

export const SubmitBodySchema = z.strictObject({
  challengeId: z.string().min(1).max(64),
  stack: StackSchema,
});

export interface SubmissionRow {
  challenge_id: string;
  stack: Stack;
  stack_hash: string;
  score: number;
  tool_count: number;
}

export type Prepared =
  | { ok: true; challenge: Challenge; result: RunResult; row: SubmissionRow }
  | { ok: false; status: 400 | 422; error: string; details?: string[] };

export function prepareSubmission(body: unknown, data: Data): Prepared {
  const parsed = SubmitBodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Send only { challengeId, stack }. Scores are computed on the server.",
      details: parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`),
    };
  }
  const { challengeId, stack } = parsed.data;

  const challenge = data.challenges.find((c) => c.id === challengeId);
  if (!challenge) return { ok: false, status: 400, error: `Unknown challenge "${challengeId}"` };

  const problems = checkStack(stack, data);
  if (problems.length) return { ok: false, status: 400, error: "Invalid stack", details: problems };

  const result = evaluate(stack, challenge, data);
  if (!result.passed) {
    return {
      ok: false,
      status: 422,
      error: "Only stacks that deploy can go on the leaderboard.",
      details: result.issues.filter((i) => i.severity === "error").map((i) => i.message),
    };
  }

  return {
    ok: true,
    challenge,
    result,
    row: {
      challenge_id: challenge.id,
      stack,
      stack_hash: encodeStack(stack),
      score: result.score,
      tool_count: result.stats.toolCount,
    },
  };
}
