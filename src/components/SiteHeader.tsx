import Link from "next/link";
import { LoginButton } from "./LoginButton";

export function SiteHeader({ tagline }: { tagline?: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Link href="/" className="text-3xl font-black tracking-tight sm:text-4xl">
          Stack<span className="text-violet-400">Run</span>
        </Link>
        {tagline && <p className="mt-1 text-zinc-400">{tagline}</p>}
      </div>
      <nav className="flex items-center gap-4 text-sm text-zinc-400">
        <Link href="/challenges" className="hover:text-zinc-100">
          Challenges
        </Link>
        <Link href="/leaderboard" className="hover:text-zinc-100">
          Leaderboard
        </Link>
        <LoginButton />
      </nav>
    </header>
  );
}
