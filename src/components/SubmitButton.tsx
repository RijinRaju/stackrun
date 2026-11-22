"use client";
import Link from "next/link";
import { useState } from "react";
import type { Stack } from "@/engine";
import { signInWithGitHub, useUser } from "@/lib/supabase/useUser";

type Outcome =
  | { kind: "idle" | "sending" }
  | { kind: "saved"; improved: boolean; best: number; rank: number | null }
  | { kind: "error"; message: string };

export function SubmitButton({
  stack,
  challengeId,
  passed,
}: {
  stack: Stack;
  challengeId: string;
  passed: boolean;
}) {
  const user = useUser();
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  if (user.status === "disabled") return null;

  const btn =
    "rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50";

  if (!passed) {
    return (
      <button type="button" disabled className={btn} title="Fix the errors first">
        🏆 Submit to leaderboard
      </button>
    );
  }

  if (user.status !== "in") {
    return (
      <button
        type="button"
        onClick={signInWithGitHub}
        disabled={user.status === "loading"}
        className={btn}
      >
        🏆 Sign in with GitHub to submit
      </button>
    );
  }

  async function submit() {
    setOutcome({ kind: "sending" });
    try {
      // Only the challenge and the stack: the server computes the score.
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, stack }),
      });
      const body = await res.json();
      if (!res.ok) {
        setOutcome({ kind: "error", message: body.error ?? "Something went wrong" });
        return;
      }
      setOutcome({
        kind: "saved",
        improved: body.improved,
        best: body.best.score,
        rank: body.rank,
      });
    } catch {
      setOutcome({ kind: "error", message: "Network error, try again." });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={submit} disabled={outcome.kind === "sending"} className={btn}>
        {outcome.kind === "sending" ? "Submitting…" : "🏆 Submit to leaderboard"}
      </button>
      <p className="text-sm" role="status">
        {outcome.kind === "saved" && (
          <>
            <span className="text-zinc-200">
              {outcome.improved ? "New best! " : `Your best is still ${outcome.best}. `}
              {outcome.rank !== null && <>You’re #{outcome.rank}. </>}
            </span>
            <Link
              href={`/leaderboard?c=${challengeId}`}
              className="text-violet-300 hover:underline"
            >
              See leaderboard →
            </Link>
          </>
        )}
        {outcome.kind === "error" && <span className="text-rose-300">{outcome.message}</span>}
      </p>
    </div>
  );
}
