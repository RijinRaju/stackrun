import type { Metadata } from "next";
import Link from "next/link";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { SiteHeader } from "@/components/SiteHeader";
import { challengeById, challenges, DEFAULT_CHALLENGE_ID } from "@/lib/catalog";
import { getLeaderboard, TOP_N } from "@/lib/leaderboard";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leaderboard · StackRun" };

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  const { c } = await searchParams;
  const challenge =
    challengeById(typeof c === "string" ? c : null) ?? challengeById(DEFAULT_CHALLENGE_ID)!;
  const user = await getCurrentUser();
  const board = await getLeaderboard(challenge.id, user?.id ?? null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <SiteHeader />
      <h1 className="text-2xl font-bold sm:text-3xl">Leaderboard</h1>
      <p className="mt-1 text-zinc-400">
        Top {TOP_N} per challenge. Ties go to fewer tools, then to whoever got there first.
      </p>

      <nav aria-label="Challenges" className="mt-6 flex flex-wrap gap-2">
        {challenges.map((ch) => (
          <Link
            key={ch.id}
            href={`/leaderboard?c=${ch.id}`}
            aria-current={ch.id === challenge.id ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              ch.id === challenge.id
                ? "bg-violet-500 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {ch.title}
          </Link>
        ))}
      </nav>
      <p className="mt-3 text-sm text-zinc-500">{challenge.brief}</p>

      <section className="mt-6">
        {!board.configured ? (
          <Notice title="The leaderboard isn’t set up yet">
            It needs a Supabase project. See <code>docs/SUPABASE.md</code> in the repo. Everything
            else (building, running and sharing stacks) works without it.
          </Notice>
        ) : board.error ? (
          <Notice title="Couldn’t load the leaderboard">Please try again in a moment.</Notice>
        ) : board.entries.length === 0 ? (
          <Notice title="No scores yet">
            Be the first:{" "}
            <Link href={`/?c=${challenge.id}`} className="text-violet-300 hover:underline">
              build a stack for “{challenge.title}”
            </Link>{" "}
            and submit it.
          </Notice>
        ) : (
          <LeaderboardTable entries={board.entries} me={board.me} challengeId={challenge.id} />
        )}

        {board.configured && !board.error && (
          <p className="mt-4 text-sm text-zinc-500">
            {user ? (
              board.entries.some((e) => e.isMe) || board.me ? null : (
                <>You haven’t submitted a stack for this challenge yet. </>
              )
            ) : (
              <>Sign in with GitHub and submit a passing stack to get ranked. </>
            )}
            <Link href={`/?c=${challenge.id}`} className="text-violet-300 hover:underline">
              Play this challenge →
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h2 className="font-semibold text-zinc-100">{title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{children}</p>
    </div>
  );
}
