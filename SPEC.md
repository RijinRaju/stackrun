# StackRun — Build Spec (v1)

> Working name. Check GitHub / npm / domain availability before you commit to it.

**One line:** Pick a tool for each phase of deployment, press **Run**, and watch your DevOps flow pass or fail, with plain-English reasons. Then share your stack card and climb the leaderboard.

**Type:** Hobby project. Free hosting (Vercel Hobby + Supabase Free). Time-box: ~2 weekends for v1 (M1–M4), +1 weekend for the leaderboard (M5).

---

## 1. Goals and non-goals

### Goals (v1)
1. An interactive board with **8 deployment phases**, each listing **6–8 popular tools** with a short description.
2. The user picks **one tool per phase**, or "None" for phases that allow it.
3. **Run deploy:** an animated walk through the flow that stops at the first blocking error and explains why.
4. A **score** (0–100) and a **complexity roast** ("14 tools to deploy a todo app 😅").
5. **Challenges** (scenarios), so stacks are judged against a goal, e.g. "Solo dev, $0 budget, Next.js app".
6. A **shareable stack**: a URL that encodes the stack, plus an auto-generated preview image for X/LinkedIn.
7. A **leaderboard** per challenge (GitHub login, best score per user).
8. All tool and rule data lives in JSON files, so anyone can add tools with a pull request.

### Non-goals (do NOT build in v1)
- Real deployments, or generating Terraform/YAML/Helm code (Brainboard and AWS Infrastructure Composer already do this).
- Real infrastructure simulation. Checks are **rule-based**, not a real runtime.
- Payments, teams, comments, AI features.
- More than one tool per phase (keep it simple; maybe v2).

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | One repo for UI + API routes; deploys free on Vercel |
| Styling | **Tailwind CSS** | Fast to build |
| Flow diagram | **React Flow (`@xyflow/react`)** | Nodes + edges + animation, made for this |
| State | **Zustand** | Small, simple global store |
| Validation | **Zod** | Validate the JSON data files + API inputs |
| Share image | **`next/og` (ImageResponse)** | Dynamic OG image per stack URL, rendered on the server |
| Download card | **`html-to-image`** | "Download PNG" button on the client |
| Auth + DB | **Supabase** (GitHub OAuth + Postgres) | Free tier; GitHub login fits a dev audience and limits fake entries |
| Tests | **Vitest** | Unit tests for the engine (the core logic) |
| Lint/format | ESLint + Prettier | |
| Hosting | **Vercel Hobby** | Free. Hobby is meant for personal, non-commercial projects, which fits a hobby project |

**Free-tier note:** Supabase pauses free projects after **7 days without database activity**. Normal site traffic keeps it awake. If it pauses, click "Resume project" in the dashboard; the data is kept.

---

## 3. Architecture

```
┌──────────────────────────── Browser ────────────────────────────┐
│  Board UI (phases + tool cards)  →  Zustand store (selection)   │
│            │                                                    │
│            ▼                                                    │
│  Engine (pure TS, runs in browser)  →  steps[], issues[], score │
│            │                                                    │
│            ▼                                                    │
│  React Flow canvas (animated run)   +  Result panel + roast     │
│            │                                                    │
│  Share: URL ?s=<encoded stack>      Download PNG (html-to-image)│
└────────────┬─────────────────────────────────────────────────────┘
             │ (submit to leaderboard, logged in)
             ▼
┌──────────────────── Next.js API routes (Vercel) ────────────────┐
│  POST /api/submit  → auth check → RE-RUN ENGINE ON SERVER →     │
│                      upsert best score                          │
│  GET  /api/leaderboard?challenge=…                              │
│  GET  /api/og?s=…  → OG image for shared stacks                 │
└────────────┬─────────────────────────────────────────────────────┘
             ▼
        Supabase (Postgres + GitHub OAuth, Row Level Security)
```

**Key rule:** the engine is **pure TypeScript with no React or DB imports**. The same code runs in the browser (instant feedback) and on the server (trusted leaderboard score). **Never trust a score sent from the browser.**

---

## 4. Repo structure

```
stackrun/
├─ data/
│  ├─ phases.json          # the 8 phases, order, whether "None" is allowed
│  ├─ tools.json           # every tool + metadata
│  ├─ rules.json           # requires / conflicts / overkill / recommends
│  └─ challenges.json      # scenarios with goals + scoring weights
├─ src/
│  ├─ engine/
│  │  ├─ schema.ts         # Zod schemas + TS types for all data files
│  │  ├─ load.ts           # load + validate data
│  │  ├─ evaluate.ts       # evaluate(stack, challenge) → RunResult
│  │  ├─ score.ts          # scoring formula
│  │  ├─ roast.ts          # funny one-liners from the result
│  │  └─ encode.ts         # stack <-> short URL string
│  ├─ app/
│  │  ├─ page.tsx                  # board (home)
│  │  ├─ s/page.tsx                # shared stack view (?s=…)
│  │  ├─ leaderboard/page.tsx
│  │  ├─ challenges/page.tsx
│  │  └─ api/
│  │     ├─ submit/route.ts
│  │     ├─ leaderboard/route.ts
│  │     └─ og/route.tsx
│  ├─ components/
│  │  ├─ PhaseColumn.tsx  ToolCard.tsx  ToolInfoDrawer.tsx
│  │  ├─ FlowCanvas.tsx   RunButton.tsx  ResultPanel.tsx
│  │  ├─ ScoreBadge.tsx   StackCard.tsx  ChallengePicker.tsx
│  │  └─ LeaderboardTable.tsx  LoginButton.tsx
│  ├─ store/useStack.ts
│  └─ lib/supabase.ts
├─ tests/engine/*.test.ts
├─ scripts/validate-data.ts   # run in CI: schema + no broken tool ids in rules
└─ .github/workflows/ci.yml   # lint, typecheck, test, validate-data
```

---

## 5. Data model (JSON files)

### 5.1 Phases (`data/phases.json`)
| id | Name | "None" allowed? |
|---|---|---|
| `source` | Source control | no |
| `ci` | CI (build + test) | yes |
| `build` | Build / package (container) | yes |
| `infra` | Infrastructure (IaC) | yes |
| `runtime` | Runtime / hosting / orchestration | no |
| `cd` | Deploy / CD | yes |
| `secrets` | Secrets | yes |
| `observe` | Monitoring / logs | yes |

### 5.2 Tool (`data/tools.json`)
```json
{
  "id": "argocd",
  "name": "Argo CD",
  "phase": "cd",
  "description": "Keeps your Kubernetes cluster in sync with what's in Git (GitOps).",
  "use": "Auto-deploy to Kubernetes when you merge to main.",
  "cost": "free",              // free | freemium | paid
  "difficulty": 4,             // 1 (easy) – 5 (hard)
  "selfHosted": true,
  "provides": ["gitops", "k8s-deploy"],
  "website": "https://argo-cd.readthedocs.io",
  "logo": "/logos/argocd.svg"
}
```
Starter set: about 6–8 tools per phase, e.g.
- source: GitHub, GitLab, Bitbucket
- ci: GitHub Actions, GitLab CI, Jenkins, CircleCI
- build: Docker, Buildpacks, Nixpacks
- infra: Terraform, Pulumi, OpenTofu, Ansible, CloudFormation
- runtime: Vercel, Railway, Fly.io, a single VM + Nginx, AWS ECS, Kubernetes (EKS/GKE/AKS), Docker Compose on a VPS
- cd: Argo CD, Flux, Helm, Spinnaker, "built into platform"
- secrets: Vault, Doppler, AWS Secrets Manager, platform env vars, `.env` file
- observe: Prometheus + Grafana, Datadog, Grafana Cloud, Sentry, platform logs

### 5.3 Rules (`data/rules.json`)
Rule types (all data, no code per rule):

| type | Meaning | Severity | Example |
|---|---|---|---|
| `requires` | Tool A needs one of tools/capabilities B | **error** (blocks run) | Argo CD requires `kubernetes` runtime |
| `conflicts` | A and B together don't make sense | **error** | Vercel runtime + Helm |
| `pairs_well` | A and B work great together | bonus | GitHub + GitHub Actions |
| `overkill` | Tool is too heavy for the challenge size | warning | Kubernetes when `scale = "solo"` |
| `missing` | Phase left empty that the challenge expects | warning / error | No secrets tool + challenge says "handles payments" |
| `insecure` | Risky choice | warning | `.env` file for production secrets |

```json
{ "id": "argocd-needs-k8s", "type": "requires", "tool": "argocd",
  "needs": { "capability": "kubernetes" }, "severity": "error",
  "message": "Argo CD deploys to Kubernetes, but your runtime isn't Kubernetes." }
```

Aim for **~20 rules in M2**, growing to 50+ through community PRs.

### 5.4 Challenges (`data/challenges.json`)
```json
{
  "id": "solo-zero-budget",
  "title": "Solo dev, $0 budget",
  "brief": "Ship a Next.js side project. One developer, no money, ~100 users.",
  "scale": "solo",                 // solo | startup | enterprise
  "budget": 0,
  "mustHave": ["source", "runtime"],
  "niceToHave": ["ci", "observe"],
  "weights": { "valid": 40, "simplicity": 25, "cost": 20, "coverage": 10, "bestPractice": 5 }
}
```
Starter challenges: `solo-zero-budget`, `startup-10k-users`, `enterprise-compliance`, `chaos-mode` (most tools without errors, just for fun).

---

## 6. Engine (`src/engine`)

```ts
type Stack = Record<PhaseId, ToolId | null>;

interface RunStep {
  phase: PhaseId; tool: ToolId | null;
  status: "ok" | "warn" | "fail" | "skipped";
  messages: string[];
}

interface RunResult {
  passed: boolean;               // false if any error
  steps: RunStep[];              // in phase order, for the animation
  issues: Issue[];               // all errors + warnings
  score: number;                 // 0–100 (0 if !passed, else weighted)
  breakdown: Record<string, number>;
  roast: string;
  stats: { toolCount: number; avgDifficulty: number; monthlyCostHint: string };
}

evaluate(stack: Stack, challenge: Challenge, data: Data): RunResult
```

**Run order:** walk the phases in order. For each phase, apply the rules that involve the selected tool. The **first `error` marks that step `fail`**, and all later steps are `skipped` (that drives the "deployment broke here" animation). Warnings don't stop the run.

### Scoring (0–100)
- **valid** — passed with no errors = full points, else score = 0.
- **simplicity** — fewer tools and lower difficulty for the same coverage score higher. Penalise `overkill`.
- **cost** — free/freemium tools score higher when the challenge budget is low.
- **coverage** — must-have and nice-to-have phases filled.
- **bestPractice** — `pairs_well` bonuses, a real secrets tool, monitoring present, minus `insecure` warnings.

Final = Σ (sub-score × weight). Keep it **deterministic**: same stack + challenge → same score, always.

### Roasts (`roast.ts`)
A small table of conditions → lines, e.g.
- toolCount ≥ 7 and scale = solo → "8 tools for 100 users. Your stack has more services than your app has users."
- Kubernetes + solo → "Kubernetes for a side project? Bold."
- runtime = Vercel, nothing else → "Push to main and go to sleep. Respect."

---

## 7. UI / screens

1. **Board (home):** challenge picker on top → 8 phase columns (cards with logo, name, cost badge, difficulty dots) → click a card to select it; an ⓘ icon opens a drawer with description, use and website.
2. **Flow canvas:** the selected tools as nodes, left → right, with edges between phases. **Run deploy** animates node by node (green ✓ / amber ⚠ / red ✗, the rest grey "skipped").
3. **Result panel:** pass/fail, score badge, list of issues with messages, the roast line, and buttons: *Share link*, *Download card*, *Submit to leaderboard*.
4. **Shared view `/s?s=…`:** read-only stack + result + "Build your own" button. Has a dynamic OG image.
5. **Leaderboard:** tabs per challenge; columns: rank, GitHub avatar + username, score, tool count, stack icons, date. Click a row to open that stack.
6. **Mobile:** phases stack vertically; the canvas becomes a vertical list.

Design: dark theme by default, tool logos as the visual hook, big score number. Keep it playful.

---

## 8. Leaderboard (M5)

### Tables (Supabase)
```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  github_username text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  challenge_id text not null,
  stack jsonb not null,
  stack_hash text not null,
  score int not null,
  tool_count int not null,
  created_at timestamptz default now(),
  unique (user_id, challenge_id)          -- one entry (best) per user per challenge
);
create index on submissions (challenge_id, score desc, created_at asc);
```

### Rules
- **RLS:** anyone can `select`; only the server (service role) can insert/update. Users never write scores directly.
- `POST /api/submit` flow: verify the Supabase session → validate input with Zod → **re-run `evaluate()` on the server** → if `passed` and the new score is higher than the existing one, upsert → return rank.
- Tie-break: higher score first, then **fewer tools**, then earlier submission.
- **Anti-spam:** login required, one row per user per challenge, reject unknown tool ids, simple per-user rate limit (e.g. 10 submits/hour, checked by counting recent rows or an in-memory guard).
- Show **"Top 50"** per challenge plus "your rank".

**Fun extras (optional):** a "Most chaotic stack that still passes" board for `chaos-mode`, and a weekly featured challenge.

---

## 9. Milestones (build in this order)

| # | Milestone | Done when… |
|---|---|---|
| **M1** | Scaffold + data | Next.js + Tailwind + Vitest set up; `phases/tools/rules/challenges.json` with Zod schemas; `validate-data` script passes in CI |
| **M2** | Engine | `evaluate()`, scoring and roasts done; **≥20 unit tests** (valid stacks, each rule type, determinism) |
| **M3** | Board + run animation | Selecting tools works; React Flow canvas; Run animates pass/warn/fail/skipped; result panel shows score, issues and roast |
| **M4** | Share | Stack encoded in the URL; `/s` read-only page; `next/og` preview image; Download PNG card; deployed on Vercel |
| **M5** | Leaderboard | GitHub login via Supabase; `/api/submit` with server-side scoring; leaderboard page with tabs per challenge; RLS on |
| **M6** | Polish + launch | Mobile layout, logos, README with GIF, CONTRIBUTING.md ("add a tool in 5 minutes"), launch post |

---

## 10. Prompts to give Claude (one milestone at a time)

> Paste this spec into the project first, then use one prompt per milestone. Review and test each before moving on.

**M1:** "Read SPEC.md. Scaffold the Next.js (App Router, TypeScript, Tailwind) project exactly as in section 4. Create the data files from section 5 with the starter tools for all 8 phases, ~20 rules and the 4 challenges. Add Zod schemas in `src/engine/schema.ts` and a `scripts/validate-data.ts` that fails if any rule references an unknown tool id. Add a GitHub Actions CI workflow running lint, typecheck, test and validate-data."

**M2:** "Implement the engine in `src/engine` per section 6: `evaluate`, `score`, `roast`, `encode`. It must be pure TypeScript with no React or DB imports, and deterministic. Write at least 20 Vitest tests covering every rule type, the skip-after-first-error behaviour, scoring weights and URL encoding round-trips."

**M3:** "Build the board UI from section 7: challenge picker, phase columns, tool cards, info drawer, Zustand store, React Flow canvas with the animated Run, and the result panel. Use the engine from M2; don't put scoring logic in components."

**M4:** "Add sharing per section 7: encode the stack in `?s=`, a read-only `/s` page, a dynamic OG image with `next/og` showing the tools, score and roast, and a Download PNG button using html-to-image."

**M5:** "Add the leaderboard per section 8 with Supabase: GitHub OAuth, the two tables with RLS (public read, server-only write), `POST /api/submit` that re-runs `evaluate()` server-side and keeps only the best score per user per challenge, `GET /api/leaderboard`, and the leaderboard page. Never accept a score from the client."

---

## 11. Launch checklist (M6)

- README: one-line hook, GIF of a run failing then passing, live link, "Add a tool" section.
- CONTRIBUTING.md: how to add a tool/rule in `data/*.json` + run `npm run validate-data`.
- Label 5 issues `good first issue` (e.g. "Add Coolify", "Add Kamal", "Add Render").
- X post: the 2013 vs 2026 meme + "so I built a thing that roasts your deploy stack" + your own stack card. Link in the first reply.
- Ask people to post their cards and beat the leaderboard.

---

## 12. v2 ideas (only if people use v1)
- Multiple tools per phase (e.g. Prometheus + Sentry).
- "Explain my stack" mode for beginners.
- Export the flow as a diagram (Mermaid/PNG).
- Seasonal challenges and badges.
