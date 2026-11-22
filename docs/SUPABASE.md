# Setting up the leaderboard (Supabase + GitHub login)

The board, Run and sharing work without any of this. You only need it for
GitHub sign-in and the leaderboard. Everything here fits in the free tiers.

## 1. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** (free plan is fine).
2. Wait for it to finish provisioning.

## 2. Create the tables

Open **SQL Editor** → **New query**, paste the whole of
[`supabase/migrations/20261122000000_leaderboard.sql`](../supabase/migrations/20261122000000_leaderboard.sql)
and click **Run**.

Or with the CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This creates `profiles`, `submissions` and `submit_log`, turns on Row Level
Security, and adds two functions: `submit_score` (server-only) and
`leaderboard_rank`.

## 3. Create a GitHub OAuth app

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
   ([direct link](https://github.com/settings/applications/new)).
2. **Homepage URL:** your site, e.g. `https://stackrun.vercel.app` (or `http://localhost:3000` while testing).
3. **Authorization callback URL:** `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (Supabase shows this exact URL on the GitHub provider page).
4. Create it, then **Generate a new client secret**.

## 4. Turn on GitHub in Supabase

1. Supabase → **Authentication → Sign In / Providers → GitHub** → enable.
2. Paste the GitHub **Client ID** and **Client Secret** → Save.
3. **Authentication → URL Configuration:**
   - **Site URL:** your production URL.
   - **Redirect URLs:** add
     - `http://localhost:3000/**`
     - `https://<your-domain>/**`
     - optionally Vercel previews: `https://*-<your-vercel-team>.vercel.app/**`

## 5. Environment variables

Supabase → **Project Settings → API Keys**.

| Variable                               | Value                                                       | Where            |
| -------------------------------------- | ----------------------------------------------------------- | ---------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://<ref>.supabase.co`                                 | browser + server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key (`sb_publishable_…`) or legacy **anon** key | browser + server |
| `SUPABASE_SECRET_KEY`                  | secret key (`sb_secret_…`) or legacy **service_role** key   | **server only**  |

- **Locally:** `cp .env.example .env.local`, fill it in, restart `npm run dev`.
- **Vercel:** Project → **Settings → Environment Variables**, add all three, redeploy.

> Never prefix the secret key with `NEXT_PUBLIC_` and never commit `.env.local`
> (it's in `.gitignore`). The secret key bypasses Row Level Security.

## 6. Check it works

1. Open the site → **Sign in with GitHub** (top right).
2. Build a stack that passes → **Run deploy** → **Submit to leaderboard**.
3. You should see "New best! You're #1." and your row on `/leaderboard`.
4. In Supabase → **Table Editor → submissions**, your row is there.

## How scores stay honest

- The browser sends only `{ challengeId, stack }`. Requests with any other
  field (like `score`) are rejected.
- `/api/submit` checks your session, re-runs the engine on the server, and
  refuses stacks that don't deploy.
- Only the server can write (secret key). RLS allows public **read** only, and
  insert/update/delete are revoked from the `anon` and `authenticated` roles.
- One row per user per challenge. It's replaced only by a higher score, or the
  same score with fewer tools.
- 10 submissions per user per hour.

## Free tier note

Supabase pauses free projects after 7 days without database activity. If that
happens, click **Resume project** in the dashboard; your data is kept.
