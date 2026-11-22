// GET /api/leaderboard?challenge=<id> → top 50 (+ your entry if signed in and outside it).
import { challengeById } from "@/lib/catalog";
import { getLeaderboard } from "@/lib/leaderboard";
import { getCurrentUser } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("challenge");
  const challenge = challengeById(id);
  if (!challenge) {
    return Response.json({ error: "Unknown or missing ?challenge=" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const board = await getLeaderboard(challenge.id, user?.id ?? null);
  if (!board.configured) {
    return Response.json({ error: "Leaderboard is not configured" }, { status: 503 });
  }
  return Response.json(board, {
    status: board.error ? 502 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
