"use client";
import { challengeById, challenges, phaseById } from "@/lib/catalog";
import { useStack } from "@/store/useStack";

const SCALE_LABEL = { solo: "Solo", startup: "Startup", enterprise: "Enterprise" } as const;

const budgetLabel = (b: number) => (b === 0 ? "$0 budget" : `~$${b.toLocaleString("en-US")}/mo`);

export function ChallengePicker() {
  const challengeId = useStack((s) => s.challengeId);
  const setChallenge = useStack((s) => s.setChallenge);
  const current = challengeById(challengeId)!;

  return (
    <section
      aria-label="Challenge"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
    >
      <div role="tablist" className="flex flex-wrap gap-2">
        {challenges.map((c) => (
          <button
            key={c.id}
            role="tab"
            type="button"
            aria-selected={c.id === challengeId}
            onClick={() => setChallenge(c.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              c.id === challengeId
                ? "bg-violet-500 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-zinc-300">{current.brief}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-300">
          {SCALE_LABEL[current.scale]}
        </span>
        <span className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-300">
          {budgetLabel(current.budget)}
        </span>
        <span className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-400">
          Must have:{" "}
          <span className="text-zinc-200">
            {current.mustHave.map((p) => phaseById(p).name).join(", ")}
          </span>
        </span>
      </div>
    </section>
  );
}
