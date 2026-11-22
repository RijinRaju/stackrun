export function scoreColor(score: number, passed: boolean): string {
  if (!passed) return "text-rose-400";
  if (score >= 85) return "text-emerald-400";
  if (score >= 60) return "text-lime-300";
  if (score >= 40) return "text-amber-300";
  return "text-orange-400";
}

export function ScoreBadge({ score, passed }: { score: number; passed: boolean }) {
  return (
    <div
      className="flex flex-col items-center leading-none"
      aria-label={`Score ${score} out of 100`}
    >
      <span className={`text-7xl font-black tabular-nums ${scoreColor(score, passed)}`}>
        {score}
      </span>
      <span className="mt-1 text-xs font-medium tracking-widest text-zinc-500 uppercase">
        / 100
      </span>
    </div>
  );
}
