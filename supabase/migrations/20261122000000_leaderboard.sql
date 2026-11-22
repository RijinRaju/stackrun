-- StackRun leaderboard (SPEC.md section 8).
-- Run in the Supabase SQL editor, or with `supabase db push`.
--
-- Security model:
--   * Everyone (anon + logged in) can READ profiles and submissions.
--   * Nobody but the server can WRITE: there are no insert/update/delete
--     policies, so only the secret/service-role key (which bypasses RLS) writes,
--     and only through /api/submit after re-running the engine.

-- ── Tables ─────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  github_username text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id text not null,
  stack jsonb not null,
  stack_hash text not null,
  score int not null check (score between 0 and 100),
  tool_count int not null check (tool_count between 0 and 8),
  created_at timestamptz default now(),
  unique (user_id, challenge_id)          -- one entry (best) per user per challenge
);
-- Matches the ranking order: score desc, fewer tools, earlier submission.
create index submissions_rank_idx
  on public.submissions (challenge_id, score desc, tool_count asc, created_at asc);

-- Rate-limit log for /api/submit (10 per user per hour). Not readable by clients.
create table public.submit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index submit_log_user_idx on public.submit_log (user_id, created_at desc);

-- ── Row Level Security ─────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.submit_log enable row level security;

create policy "Profiles are public" on public.profiles for select using (true);
create policy "Submissions are public" on public.submissions for select using (true);
-- submit_log: no policies at all, so anon/authenticated can't touch it.

-- Belt and braces: no client role may write, even if a policy is added by mistake.
revoke insert, update, delete, truncate on public.profiles, public.submissions
  from anon, authenticated;
revoke all on public.submit_log from anon, authenticated;

-- ── submit_score: rate limit + keep only the best entry, atomically ─────────
-- Replaces the stored entry only if the new score is higher, or equal with
-- fewer tools (which ranks higher under the tie-break).

create function public.submit_score(
  p_user uuid,
  p_challenge text,
  p_stack jsonb,
  p_stack_hash text,
  p_score int,
  p_tool_count int,
  p_max_per_hour int default 10
)
returns table (improved boolean, best_score int, best_tool_count int)
language plpgsql
set search_path = ''
as $$
declare
  recent int;
  changed int;
begin
  select count(*) into recent
    from public.submit_log l
    where l.user_id = p_user and l.created_at > now() - interval '1 hour';
  if recent >= p_max_per_hour then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.submit_log (user_id) values (p_user);
  delete from public.submit_log l
    where l.user_id = p_user and l.created_at < now() - interval '1 day';

  insert into public.submissions as s
      (user_id, challenge_id, stack, stack_hash, score, tool_count)
    values (p_user, p_challenge, p_stack, p_stack_hash, p_score, p_tool_count)
    on conflict (user_id, challenge_id) do update
      set stack = excluded.stack,
          stack_hash = excluded.stack_hash,
          score = excluded.score,
          tool_count = excluded.tool_count,
          created_at = now()
      where excluded.score > s.score
         or (excluded.score = s.score and excluded.tool_count < s.tool_count);
  get diagnostics changed = row_count;

  return query
    select changed > 0, s.score, s.tool_count
      from public.submissions s
      where s.user_id = p_user and s.challenge_id = p_challenge;
end
$$;

revoke execute on function public.submit_score(uuid, text, jsonb, text, int, int, int)
  from public, anon, authenticated;
grant execute on function public.submit_score(uuid, text, jsonb, text, int, int, int)
  to service_role;

-- ── leaderboard_rank: a user's position (null if they have no entry) ────────

create function public.leaderboard_rank(p_challenge text, p_user uuid)
returns int
language sql
stable
set search_path = ''
as $$
  select case
    when me.user_id is null then null
    else 1 + (
      select count(*)::int
        from public.submissions o
        where o.challenge_id = p_challenge
          and (
            o.score > me.score
            or (o.score = me.score and o.tool_count < me.tool_count)
            or (o.score = me.score and o.tool_count = me.tool_count
                and o.created_at < me.created_at)
          )
    )
  end
  from (select 1) one
  left join public.submissions me
    on me.challenge_id = p_challenge and me.user_id = p_user
$$;

grant execute on function public.leaderboard_rank(text, uuid) to anon, authenticated, service_role;
