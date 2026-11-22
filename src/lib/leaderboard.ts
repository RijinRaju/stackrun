import "server-only";
// Leaderboard reads. Uses the publishable key, so these go through RLS (public read).
import { emptyStack, StackSchema, type Stack } from "@/engine";
import { createSupabaseServer } from "./supabase/server";

export const TOP_N = 50;

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  score: number;
  toolCount: number;
  stack: Stack;
  createdAt: string;
  isMe: boolean;
}

export type Leaderboard =
  | { configured: false }
  | {
      configured: true;
      challengeId: string;
      entries: LeaderboardEntry[];
      /** the signed-in user's entry when it's outside the top N */
      me: LeaderboardEntry | null;
      error?: string;
    };

interface Row {
  user_id: string;
  score: number;
  tool_count: number;
  stack: unknown;
  created_at: string;
  profiles:
    | { github_username: string; avatar_url: string | null }
    | { github_username: string; avatar_url: string | null }[]
    | null;
}

const COLUMNS =
  "user_id, score, tool_count, stack, created_at, profiles(github_username, avatar_url)";

function toEntry(row: Row, rank: number, userId: string | null): LeaderboardEntry {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const stack = StackSchema.safeParse(row.stack);
  return {
    rank,
    userId: row.user_id,
    username: profile?.github_username ?? "unknown",
    avatarUrl: profile?.avatar_url ?? null,
    score: row.score,
    toolCount: row.tool_count,
    stack: stack.success ? stack.data : emptyStack(),
    createdAt: row.created_at,
    isMe: row.user_id === userId,
  };
}

export async function getLeaderboard(
  challengeId: string,
  userId: string | null,
): Promise<Leaderboard> {
  const supabase = await createSupabaseServer();
  if (!supabase) return { configured: false };

  // Same order as the ranking: score desc, fewer tools, earlier submission.
  const top = await supabase
    .from("submissions")
    .select(COLUMNS)
    .eq("challenge_id", challengeId)
    .order("score", { ascending: false })
    .order("tool_count", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(TOP_N)
    .returns<Row[]>();

  if (top.error) {
    console.error("leaderboard query failed", top.error);
    return { configured: true, challengeId, entries: [], me: null, error: "Couldn't load scores" };
  }

  const entries = top.data.map((row, i) => toEntry(row, i + 1, userId));

  let me: LeaderboardEntry | null = null;
  if (userId && !entries.some((e) => e.isMe)) {
    const [mine, rank] = await Promise.all([
      supabase
        .from("submissions")
        .select(COLUMNS)
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .maybeSingle<Row>(),
      supabase.rpc("leaderboard_rank", { p_challenge: challengeId, p_user: userId }),
    ]);
    if (mine.data && typeof rank.data === "number") me = toEntry(mine.data, rank.data, userId);
  }

  return { configured: true, challengeId, entries, me };
}
