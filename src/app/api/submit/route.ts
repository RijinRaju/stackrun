// POST /api/submit  { challengeId, stack }
// Auth check → validate → RE-RUN evaluate() on the server → keep best score.
// Never accepts a score from the client (see src/lib/submit.ts).
import { data } from "@/lib/catalog";
import { githubAvatar, githubName } from "@/lib/githubUser";
import { prepareSubmission } from "@/lib/submit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  // JSON only: plain HTML forms from other sites can't send this content type.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Expected application/json" }, 415);
  }

  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();
  if (!supabase || !admin) return json({ error: "Leaderboard is not configured" }, 503);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Sign in with GitHub to submit" }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const prepared = prepareSubmission(body, data);
  if (!prepared.ok) {
    return json({ error: prepared.error, details: prepared.details }, prepared.status);
  }
  const { row, result } = prepared;

  // Keep the public profile in sync with GitHub (username/avatar can change).
  const profile = await admin.from("profiles").upsert({
    id: user.id,
    github_username: githubName(user),
    avatar_url: githubAvatar(user),
  });
  if (profile.error) {
    console.error("profile upsert failed", profile.error);
    return json({ error: "Could not save your profile" }, 500);
  }

  const submitted = await admin
    .rpc("submit_score", {
      p_user: user.id,
      p_challenge: row.challenge_id,
      p_stack: row.stack,
      p_stack_hash: row.stack_hash,
      p_score: row.score,
      p_tool_count: row.tool_count,
    })
    .single<{ improved: boolean; best_score: number; best_tool_count: number }>();

  if (submitted.error) {
    if (submitted.error.message.includes("rate_limited")) {
      return json({ error: "Easy there: 10 submissions per hour. Try again later." }, 429);
    }
    console.error("submit_score failed", submitted.error);
    return json({ error: "Could not save your score" }, 500);
  }

  const rank = await admin.rpc("leaderboard_rank", {
    p_challenge: row.challenge_id,
    p_user: user.id,
  });

  return json({
    score: result.score,
    improved: submitted.data.improved,
    best: { score: submitted.data.best_score, toolCount: submitted.data.best_tool_count },
    rank: typeof rank.data === "number" ? rank.data : null,
  });
}
