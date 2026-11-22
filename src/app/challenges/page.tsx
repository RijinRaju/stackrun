import Link from "next/link";
import { loadData } from "@/engine";

export const metadata = { title: "Challenges · StackRun" };

const SCALE_LABEL = { solo: "Solo", startup: "Startup", enterprise: "Enterprise" } as const;

export default function ChallengesPage() {
  const { challenges, phases } = loadData();
  const phaseName = (id: string) => phases.find((p) => p.id === id)?.name ?? id;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-200">
        ← Back to the board
      </Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">Challenges</h1>
      <p className="mt-1 text-zinc-400">
        Each challenge judges your stack against a different goal. Same tools, different score.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {challenges.map((c) => (
          <li key={c.id}>
            <Link
              href={`/?c=${c.id}`}
              className="flex h-full flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-violet-400/60 hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-zinc-50">{c.title}</h2>
                <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                  {SCALE_LABEL[c.scale]}
                </span>
              </div>
              <p className="text-sm text-zinc-400">{c.brief}</p>
              <p className="text-xs text-zinc-500">
                Must have: {c.mustHave.map(phaseName).join(", ")}
              </p>
              <span className="mt-auto text-sm font-medium text-violet-300">Play →</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
