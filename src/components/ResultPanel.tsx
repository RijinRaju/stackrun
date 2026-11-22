"use client";
// The board's result: the store's RunResult rendered by ResultView, plus share actions.
import { useEffect, useRef } from "react";
import { challengeById } from "@/lib/catalog";
import { useStack } from "@/store/useStack";
import { ResultView } from "./ResultView";
import { ShareActions } from "./ShareActions";
import { SubmitButton } from "./SubmitButton";

export function ResultPanel() {
  const run = useStack((s) => s.run);
  const result = useStack((s) => s.result);
  const stack = useStack((s) => s.stack);
  const challenge = challengeById(useStack((s) => s.challengeId))!;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (run === "done") ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [run]);

  if (run !== "done" || !result) return null;

  return (
    <ResultView
      ref={ref}
      result={result}
      challenge={challenge}
      actions={
        <div className="flex flex-col gap-3">
          <ShareActions stack={stack} result={result} challenge={challenge} />
          <SubmitButton stack={stack} challengeId={challenge.id} passed={result.passed} />
        </div>
      }
    />
  );
}
