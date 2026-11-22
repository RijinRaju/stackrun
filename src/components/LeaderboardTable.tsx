import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { phases, toolById } from "@/lib/catalog";
import { sharePath } from "@/lib/share";
import { ToolLogo } from "./ToolLogo";

const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function Row({ e, challengeId }: { e: LeaderboardEntry; challengeId: string }) {
  const tools = phases.map((p) => toolById(e.stack[p.id])).filter((t) => t !== undefined);
  return (
    <tr
      className={`relative border-t border-zinc-800 transition hover:bg-zinc-800/50 ${
        e.isMe ? "bg-violet-500/10" : ""
      }`}
    >
      <td className="py-3 pr-2 pl-4 text-right font-bold text-zinc-400 tabular-nums">
        {MEDAL[e.rank] ?? e.rank}
      </td>
      <td className="px-2 py-3">
        <Link
          href={sharePath("/s", e.stack, challengeId)}
          className="flex items-center gap-2.5 font-medium text-zinc-100 after:absolute after:inset-0"
        >
          {e.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small GitHub avatar
            <img src={e.avatarUrl} alt="" width={28} height={28} className="size-7 rounded-full" />
          ) : (
            <span className="size-7 rounded-full bg-zinc-700" />
          )}
          <span className="truncate">
            {e.username}
            {e.isMe && <span className="ml-1.5 text-xs text-violet-300">(you)</span>}
          </span>
        </Link>
      </td>
      <td className="px-2 py-3 text-right text-lg font-black text-zinc-50 tabular-nums">
        {e.score}
      </td>
      <td className="px-2 py-3 text-right text-zinc-400 tabular-nums">{e.toolCount}</td>
      <td className="hidden px-2 py-3 md:table-cell">
        <span className="flex gap-1">
          {tools.map((t) => (
            <span key={t.id} title={t.name}>
              <ToolLogo tool={t} size={22} />
            </span>
          ))}
        </span>
      </td>
      <td className="hidden py-3 pr-4 pl-2 text-right text-xs whitespace-nowrap text-zinc-500 sm:table-cell">
        {date.format(new Date(e.createdAt))}
      </td>
    </tr>
  );
}

export function LeaderboardTable({
  entries,
  me,
  challengeId,
}: {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  challengeId: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <table className="w-full text-sm">
        <thead className="text-xs tracking-wide text-zinc-500 uppercase">
          <tr>
            <th className="py-3 pr-2 pl-4 text-right font-medium">#</th>
            <th className="px-2 py-3 text-left font-medium">Player</th>
            <th className="px-2 py-3 text-right font-medium">Score</th>
            <th className="px-2 py-3 text-right font-medium">Tools</th>
            <th className="hidden px-2 py-3 text-left font-medium md:table-cell">Stack</th>
            <th className="hidden py-3 pr-4 pl-2 text-right font-medium sm:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <Row key={e.userId} e={e} challengeId={challengeId} />
          ))}
          {me && (
            <>
              <tr aria-hidden>
                <td colSpan={6} className="border-t border-zinc-800 py-1 text-center text-zinc-600">
                  ⋯
                </td>
              </tr>
              <Row e={me} challengeId={challengeId} />
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
