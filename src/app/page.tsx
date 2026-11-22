import Link from "next/link";
import { Board } from "@/components/Board";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { c } = await searchParams;
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Stack<span className="text-violet-400">Run</span>
          </h1>
          <p className="mt-1 text-zinc-400">
            Pick a tool for each phase, press Run, and see if your deploy survives.
          </p>
        </div>
        <nav className="flex gap-4 text-sm text-zinc-400">
          <Link href="/challenges" className="hover:text-zinc-100">
            Challenges
          </Link>
          <Link href="/leaderboard" className="hover:text-zinc-100">
            Leaderboard
          </Link>
        </nav>
      </header>
      <Board initialChallengeId={typeof c === "string" ? c : undefined} />
    </main>
  );
}
