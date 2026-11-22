"use client";
// Renders the engine's RunResult. No scoring or rule logic here.
import { useEffect, useRef } from "react";
import type { Issue, Weights } from "@/engine";
import { challengeById, phaseById, toolById } from "@/lib/catalog";
import { useStack } from "@/store/useStack";
import { ScoreBadge } from "./ScoreBadge";

const CATEGORY_LABEL: Record<keyof Weights, string> = {
  valid: "Deploys",
  simplicity: "Simplicity",
  cost: "Cost fit",
  coverage: "Coverage",
  bestPractice: "Best practice",
};

function IssueRow({ issue }: { issue: Issue }) {
  const error = issue.severity === "error";
  const where = [phaseById(issue.phase).name, toolById(issue.tool)?.name]
    .filter(Boolean)
    .join(" · ");
  return (
    <li
      className={`flex gap-3 rounded-xl border px-3 py-2.5 ${
        error ? "border-rose-500/40 bg-rose-500/10" : "border-amber-400/30 bg-amber-400/5"
      }`}
    >
      <span aria-hidden className={error ? "text-rose-400" : "text-amber-300"}>
        {error ? "✗" : "⚠"}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-zinc-100">{issue.message}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          <span className="sr-only">{error ? "Error" : "Warning"}: </span>
          {where}
        </p>
      </div>
    </li>
  );
}

export function ResultPanel() {
  const run = useStack((s) => s.run);
  const result = useStack((s) => s.result);
  const challenge = challengeById(useStack((s) => s.challengeId))!;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (run === "done") ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [run]);

  if (run !== "done" || !result) return null;

  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");
  const categories = (Object.keys(challenge.weights) as (keyof Weights)[]).filter(
    (k) => challenge.weights[k] > 0,
  );

  return (
    <section
      ref={ref}
      aria-live="polite"
      aria-label="Run result"
      className="grid gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:grid-cols-[auto_1fr]"
    >
      <div className="flex flex-col items-center gap-3 md:border-r md:border-zinc-800 md:pr-6">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold tracking-widest uppercase ${
            result.passed ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
          }`}
        >
          {result.passed ? "Deployed" : "Deploy failed"}
        </span>
        <ScoreBadge score={result.score} passed={result.passed} />
        <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-xs">
          <dt className="text-zinc-500">Tools</dt>
          <dd className="text-zinc-200 tabular-nums">{result.stats.toolCount}</dd>
          <dt className="text-zinc-500">Avg difficulty</dt>
          <dd className="text-zinc-200 tabular-nums">{result.stats.avgDifficulty}/5</dd>
          <dt className="text-zinc-500">Cost</dt>
          <dd className="text-zinc-200">{result.stats.monthlyCostHint}</dd>
        </dl>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <blockquote className="text-xl leading-snug font-semibold text-zinc-50 sm:text-2xl">
          “{result.roast}”
        </blockquote>

        {result.passed && (
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((k) => (
              <div key={k}>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">{CATEGORY_LABEL[k]}</span>
                  <span className="text-zinc-300 tabular-nums">
                    {Math.round(result.breakdown[k])} / {challenge.weights[k]}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-violet-400 transition-[width] duration-700"
                    style={{ width: `${(result.breakdown[k] / challenge.weights[k]) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {result.issues.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">
              {errors.length > 0 && `${errors.length} error${errors.length > 1 ? "s" : ""}`}
              {errors.length > 0 && warnings.length > 0 && ", "}
              {warnings.length > 0 && `${warnings.length} warning${warnings.length > 1 ? "s" : ""}`}
            </h3>
            <ul className="flex flex-col gap-2">
              {[...errors, ...warnings].map((i) => (
                <IssueRow key={`${i.ruleId}-${i.phase}`} issue={i} />
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-emerald-300">No errors, no warnings. Ship it.</p>
        )}

        {result.bonuses.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">Nice pairings</h3>
            <ul className="flex flex-col gap-1.5">
              {result.bonuses.map((b) => (
                <li key={b.ruleId} className="flex gap-2 text-sm text-zinc-300">
                  <span aria-hidden className="text-violet-300">
                    ✦
                  </span>
                  {b.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
