# Backend handoff — Claude Code

Branch `agent/backend`, based on bootstrap `f574868` (contracts 1.0.0). Compatible with Codex's 1.0.1 (`084367a`, flashcard `sourceRefs` may be empty): generation falls back to the concept's own refs.

## API status

All routes in `docs/API-CONTRACT.md` are implemented under `src/app/api/v1/**` with `{ data }` / `{ error: { code, message, requestId, retryable } }` envelopes, strict Zod bodies (128 KiB cap) and `Cache-Control: no-store`.

| Area | Routes | Notes |
| --- | --- | --- |
| Profile | GET/PATCH `/profile` | Row created lazily; IANA timezone (default `Asia/Ho_Chi_Minh`); `connections.ai` from env presence |
| Study sets / sources | `/study-sets`, `/study-sets/:id`, `/study-sets/:id/sources`, `/sources/:id` | Optimistic `expectedRevision` (409). Every source revision is an immutable `source_revisions` snapshot; delete is soft so history stays valid. Deleting a set detaches its sessions and cascades its knowledge |
| Concepts | `/concepts`, `/concepts/:id` | Created `pending`; approve/reject via `status` + `expectedRevision`. `sourceRefs` must point at an owned source revision of the same set and quote it verbatim |
| Sessions / chat | `/sessions`, `/sessions/:id`, `/messages`, `/messages/stream`, `/finish` | See SSE below. `finish` needs a session with a study set (400 otherwise), creates **pending** concepts only, dedupes by (user, session, key), warns on normalized-title duplicates, ends the session |
| Practice | `/practice-attempts`, `/:id`, `/:id/evaluate`, `/:id/retry` | Attempt stored (with full approved-concept snapshots) before AI. Evaluation re-validated: learner quotes must exist verbatim (offsets checked), evidence must cite the attempt's snapshots and exact source revisions; insufficient evidence ⇒ null scores. Retry = new attempt on identical snapshots |
| Cards / review | `/cards`, `/cards/generate`, `/cards/:id`, `/cards/:id/grade`, `/review/due` | One card per concept (unique index); same key ⇒ original card, new key ⇒ regenerate in place (revision+1, scheduler kept). Approval + concept revision rechecked under row lock after the AI call |
| Progress / search | `/progress`, `/search?q=` | `reviews-v1` exactly as spec; AI observations listed separately. Search: owner-scoped ILIKE over session titles, message content, concept title/body |
| Auth | GET `/auth/callback` | Code exchange; `next` limited to same-origin relative paths; failure ⇒ `/login?error=auth` |

### Chat SSE semantics (`src/server/services/sessions.ts`)
- User message (completed) + assistant (`streaming`) are inserted before the AI call; `meta` carries both IDs.
- Same `requestId` + same content: completed ⇒ `meta`+`done` replay, no AI call; failed/cancelled ⇒ regenerated into the **same** IDs; in flight ⇒ 409 (stale after 2 min). Different content ⇒ 409.
- Abort (client disconnect / `request.signal`) ⇒ assistant `cancelled` with partial text, no `done`. Provider error ⇒ `failed` + `error` event. Only a full result is stored as `completed`.
- Solve mode calls `ai.solve`, stores `solve`, content is a readable rendering; follow-ups pass the latest `previousSolve`.

### Review
- `presentationId = "<cardId>.<revision>"` — server-issued, bound to card+revision; card ownership is checked. Grading (row lock → key replay → presentation/revision check → append `review_events` + update scheduler) is one transaction. Same key ⇒ stored result; reused/stale presentation ⇒ 409. DB backstops: `unique(card_id, revision_before)`, `unique(user_id, idempotency_key)`.
- ts-fsrs default parameters (fuzz off). Instants stored UTC. Due queue = cards due before the end of the learner's **local day** in the profile timezone (DST-safe), computed on read.

### AI quota (CODEX-BE-001)
`ai_reservations`: per user, advisory-locked reservation before every AI operation (chat, solve, extract, evaluate, flashcard): 20 per rolling 10 min, 2 in flight, released in `finally`, unreleased slots expire after 2 min. Exceeded ⇒ 429 `RATE_LIMITED` before any SSE headers.

## Data / security model (`src/db/schema.ts`, migration `src/db/migrations/0000_init.sql`)
- 14 tables; every row has `user_id → auth.users` (cascade). Children reference parents through **composite `(id, user_id)` FKs**, so a cross-user link is impossible even through the privileged connection.
- Services always filter by the verified `userId` from `supabase.auth.getUser()` (`src/server/auth/session.ts`); body `userId` is rejected by strict schemas. Not-owned and missing both ⇒ 404; malformed UUIDs ⇒ 404.
- RLS enabled on all tables. Policies give `authenticated` **read-only** access to its own rows; no write policies (all writes go through the API so invariants like idempotent grading cannot be bypassed via PostgREST). `ai_reservations`, `extractions`, `card_generations` have no policy ⇒ no client access.
- One migration authority: Drizzle schema generates tables, constraints and policies.

## Setup
```bash
pnpm install --frozen-lockfile
```
Env (server): `DATABASE_URL` (Supabase Postgres; pooler port 6543 works, `prepare: false` is set). Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Optional metadata: `AI_PROMPT_VERSION` (stored on evaluations until composition exposes it — BE-REQ-8). Supabase Auth redirect URL: `<APP_URL>/auth/callback`.

Migrations: `drizzle.config.ts` is requested from Codex (BE-REQ-7). Until then:
```bash
pnpm exec drizzle-kit generate --dialect=postgresql --schema=./src/db/schema.ts --out=./src/db/migrations
```
and apply `src/db/migrations/0000_init.sql` to Supabase (SQL editor or `psql "$DATABASE_URL" -f ...`). It needs Supabase's `auth.users` table and `authenticated` role (present on every Supabase project). Non-destructive: creates tables only.

## Checks run (in `.worktrees/backend`)
- `pnpm typecheck` PASS · `pnpm lint` PASS (0 problems) · `pnpm build` PASS · `pnpm test` PASS (backend 26 + Codex AI contract 2).
- Backend tests run against **PGlite** (real PostgreSQL 17 in-process) with the real migration applied, plus a minimal Supabase shim (`auth.users`, `auth.uid()`, `authenticated` role). Covered: two-user isolation for every resource incl. nested IDs/lists/search/progress, composite-FK guard, RLS read-own/no-write, approval gating, one-card-per-concept under key replay/regeneration/races, grade idempotency/stale/concurrent tabs/edit invalidation, timezone + DST day boundaries, progress policy, chat SSE persistence/replay/failure/retry/cancel/in-flight conflict/solve follow-up, extraction grounding/dedupe/idempotency, practice snapshot preservation/evidence validation/insufficient evidence/retry, AI quota, callback open-redirect guard. AI is always a test double or the real `unconfiguredAi`.
- Runtime smoke on `next start` without credentials: `/api/v1/profile` ⇒ 503 `SERVICE_UNAVAILABLE` envelope; `/auth/callback` ⇒ redirect.

**Not executed (no credentials):** live Supabase Auth sign-in/cookies, migration on a real Supabase database, RLS through PostgREST, real Nebius calls. These are unverified, not passed.

## Known limitations
- PGlite is single-connection: concurrent tests exercise the logic and constraints but not true multi-connection row-lock contention.
- Progress loads all review events of the user (marked `ponytail:`); search is ILIKE without a trigram index.
- `connections.ai`, evaluation `model`/`promptVersion` come from env until BE-REQ-8.
- Deleting a concept deletes its card and that card's review history (topic progress then ignores it); attempts keep their own snapshots.
- Sessions without a study set can chat but cannot extract concepts (extracted concepts need a set and grounded source refs).
