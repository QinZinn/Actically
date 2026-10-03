# Backend handoff — Claude Code

Branch `agent/backend`, based on bootstrap `f574868`, with Codex shared commits cherry-picked: contracts 1.0.1 (`084367a`), `drizzle.config.ts` (`c64b6b1`), AI service + `getAiMetadata` (`6f87385`), message `requestContext` contract 1.0.2 (`4305ac0`). Repair round 1 covers CODEX-BE-002..005, round 2 covers CODEX-BE-006..007.

## API status

All routes in `docs/API-CONTRACT.md` are implemented under `src/app/api/v1/**` with `{ data }` / `{ error: { code, message, requestId, retryable } }` envelopes, strict Zod bodies (128 KiB cap) and `Cache-Control: no-store`.

| Area | Routes | Notes |
| --- | --- | --- |
| Profile | GET/PATCH `/profile` | Row created lazily; IANA timezone (default `Asia/Ho_Chi_Minh`); `connections.ai` from `getAiMetadata().configured` |
| Study sets / sources | `/study-sets`, `/study-sets/:id`, `/study-sets/:id/sources`, `/sources/:id` | Optimistic `expectedRevision` (409). Every source revision is an immutable `source_revisions` snapshot; delete is soft so history stays valid. Deleting a set is a soft removal (see History below) |
| Concepts | `/concepts`, `/concepts/:id` | Created `pending`; approve/reject via `status` + `expectedRevision`. `sourceRefs` must point at an owned source revision of the same set and quote it verbatim |
| Sessions / chat | `/sessions`, `/sessions/:id`, `/messages`, `/messages/stream`, `/finish` | See SSE below. `finish` needs a session with a study set (400 otherwise), creates **pending** concepts only, dedupes by (user, session, key), warns on normalized-title duplicates, ends the session |
| Practice | `/practice-attempts`, `/:id`, `/:id/evaluate`, `/:id/retry` | Attempt stored (with full approved-concept snapshots) before AI. Evaluation re-validated: learner quotes must exist verbatim (offsets checked), evidence must cite the attempt's snapshots and exact source revisions; insufficient evidence ⇒ null scores. Retry = new attempt on identical snapshots |
| Cards / review | `/cards`, `/cards/generate`, `/cards/:id`, `/cards/:id/grade`, `/review/due` | One card per concept (unique index). The (user, idempotencyKey) claim is taken **before** the AI call (`card_generations` running/completed/failed): same key + same payload ⇒ original card with no AI call; in flight ⇒ 409; failed/stale (2 min) ⇒ retried; different conceptId/expectedConceptRevision ⇒ 409. New key ⇒ regenerate in place (revision+1, scheduler kept). Approval + concept revision rechecked under row lock after the AI call |
| Progress / search | `/progress`, `/search?q=` | `reviews-v1` exactly as spec; AI observations listed separately. Search: owner-scoped ILIKE over session titles, message content, concept title/body |
| Auth | GET `/auth/callback` | Code exchange; `next` limited to same-origin relative paths; failure ⇒ `/login?error=auth` |

### Chat SSE semantics (`src/server/services/sessions.ts`)
- User message (completed) + assistant (`streaming`) are inserted before the AI call; `meta` carries both IDs.
- AI context = current sources of the set **plus** the exact (possibly older/deleted) source revisions cited by approved concepts, deduped by sourceId@revision (CODEX-BE-002). Context preparation runs inside the stream cleanup: failures mark the answer `failed` and release the quota slot (CODEX-BE-003).
- Both messages store the immutable request context (`mode`, `followUpStep`), exposed as `Message.requestContext` in history and `done` (null only for legacy rows). Same `requestId` + identical content/mode/followUpStep: completed ⇒ `meta`+`done` replay, no AI call; failed/cancelled ⇒ regenerated into the **same** IDs; in flight ⇒ 409 (stale after 2 min). Any difference in content, mode or followUpStep ⇒ 409 (CODEX-BE-007).
- Abort (client disconnect / `request.signal`, including a signal already aborted before the stream starts) ⇒ assistant `cancelled` with partial text, no `done`. Provider error ⇒ `failed` + `error` event. Only a full result is stored as `completed`.
- Evaluate / extract / generate check the request signal before and inside their success transaction (rolled back on abort ⇒ `AI_CANCELLED`, nothing persisted as success).
- Solve mode calls `ai.solve`, stores `solve`, content is a readable rendering; follow-ups pass the latest `previousSolve`.

### Review
- `presentationId = "<cardId>.<revision>"` — server-issued, bound to card+revision; card ownership is checked. Grading (row lock → key replay → presentation/revision check → append `review_events` + update scheduler) is one transaction. Same key ⇒ stored result; reused/stale presentation ⇒ 409. DB backstops: `unique(card_id, revision_before)`, `unique(user_id, idempotency_key)`.
- ts-fsrs default parameters (fuzz off). Instants stored UTC. Due queue = cards due before the end of the learner's **local day** in the profile timezone (DST-safe), computed on read.

### AI quota (CODEX-BE-001)
`ai_reservations`: per user, advisory-locked reservation before every AI operation (chat, solve, extract, evaluate, flashcard): 20 per rolling 10 min, 2 in flight, released in `finally`, unreleased slots expire after 2 min. Exceeded ⇒ 429 `RATE_LIMITED` before any SSE headers.

### History preservation (CODEX-BE-006)
Removing a card, concept or study set is a **soft delete** (`deleted_at`); nothing in the learning history is hard-deleted by the API.
- Card: leaves lists, due queue, grading and progress; its append-only `review_events` stay. The partial unique index `flashcards_active_concept_unique (concept_id) WHERE deleted_at IS NULL` lets the concept get a new card.
- Concept: soft-deletes the concept and its card; review events and practice-attempt snapshots stay.
- Study set: soft-deletes the set, its sources, concepts and cards; sessions are detached (stay usable). Review events, attempts, evaluations and source revisions stay stored. The removed set disappears from lists, search, due queue and progress; reads by ID and new mutations under it (sources, concepts, attempts, evaluate/retry) return 404.
- Hard deletion only happens through `auth.users` cascade (account deletion), which is a separate owner lifecycle.

### Request bodies (CODEX-BE-004)
`readBody` streams at most 128 KiB (declared Content-Length is only a fast path); a chunked/oversized body is cancelled without buffering the rest. Invalid UTF-8/JSON ⇒ 400 `VALIDATION_ERROR`; strict Zod schemas reject unknown keys.

## Data / security model (`src/db/schema.ts`, migrations `src/db/migrations/0000_init.sql`, `0001_card_generation_claims.sql`, `0002_history_preservation.sql`)
- 14 tables; every row has `user_id → auth.users` (cascade). Children reference parents through **composite `(id, user_id)` FKs**, so a cross-user link is impossible even through the privileged connection.
- Services always filter by the verified `userId` from `supabase.auth.getUser()` (`src/server/auth/session.ts`); body `userId` is rejected by strict schemas. Not-owned and missing both ⇒ 404; malformed UUIDs ⇒ 404.
- RLS enabled on all tables. Policies give `authenticated` **read-only** access to its own rows; no write policies (all writes go through the API so invariants like idempotent grading cannot be bypassed via PostgREST). `ai_reservations`, `extractions`, `card_generations` have no policy ⇒ no client access.
- One migration authority: Drizzle schema generates tables, constraints and policies. `0001`/`0002` only add columns/constraints (defaults/nullable keep any pre-existing rows valid); `0002` swaps the card unique index for its partial (active-only) version. No data is dropped.

## Setup
```bash
pnpm install --frozen-lockfile
pnpm db:migrate
```
Env (server): `DATABASE_URL` (Supabase Postgres; pooler port 6543 works, `prepare: false` is set; `drizzle.config.ts` also reads `.env.local`). Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Evaluation `model`/`promptVersion` and profile AI status come from Codex's `getAiMetadata()`. Supabase Auth redirect URL: `<APP_URL>/auth/callback`.

Migrations need Supabase's `auth.users` table and `authenticated` role (present on every Supabase project). After schema edits: `pnpm db:generate`.

## Checks run (in `.worktrees/backend`)
- `pnpm typecheck` PASS · `pnpm lint` PASS (0 problems) · `pnpm build` PASS · `pnpm test`: 62 passed, 2 skipped (backend 37; the rest are Codex AI tests; the 2 skipped are Codex's opt-in live Nebius tests).
- Backend tests run against **PGlite** (real PostgreSQL 17 in-process) with the real migrations applied, plus a minimal Supabase shim (`auth.users`, `auth.uid()`, `authenticated` role). Covered: two-user isolation for every resource incl. nested IDs/lists/search/progress, composite-FK guard, RLS read-own/no-write, approval gating, one-card-per-concept under key replay/regeneration/races, grade idempotency/stale/concurrent tabs/edit invalidation, timezone + DST day boundaries, progress policy, chat SSE persistence/replay/failure/retry/cancel/in-flight conflict/solve follow-up, extraction grounding/dedupe/idempotency, practice snapshot preservation/evidence validation/insufficient evidence/retry, AI quota, callback open-redirect guard.
- Repair-round tests (`tests/backend/repairs.test.ts`): chat context passes Codex's real `validateContext` after the cited source is edited and deleted; pre-aborted stream (no AI call, cancelled, slot released); context-preparation DB failure (failed + slot released); abort during evaluate/extract/generate persists nothing; 1 MiB chunked body rejected after <12 reads; concurrent identical card keys ⇒ one AI call; key payload mismatch 409; failed claim retryable. Round 2: card/concept/study-set removal keeps review events, attempts, evaluations and source revisions while hiding them from lists/due/progress/search and rejecting new mutations; chat requestId with changed mode/followUpStep ⇒ 409, identical ⇒ replay with `requestContext`, no AI call.
- AI in backend tests is always a test double or the real `unconfiguredAi`. Runtime smoke on `next start` without credentials (round 0): `/api/v1/profile` ⇒ 503 `SERVICE_UNAVAILABLE` envelope; `/auth/callback` ⇒ redirect.

**Not executed (no credentials):** live Supabase Auth sign-in/cookies, migrations on a real Supabase database, RLS through PostgREST, real Nebius calls. These are unverified, not passed.

## Known limitations
- PGlite is single-connection: concurrent tests exercise the logic and constraints but not true multi-connection row-lock contention.
- Progress loads all review events of the user (marked `ponytail:`); search is ILIKE without a trigram index.
- Chat context fails explicitly (provider `VALIDATION_ERROR`) rather than truncating when a set has more than 20 source snapshots or exceeds the 48k-char context.
- Replaying a card-generation key whose card was later removed returns 404 (the original result no longer exists); use a new key to regenerate.
- Messages created before migration `0002` have `requestContext: null` and cannot be replayed as identical (409); the frontend should offer a fresh send.
- Sessions without a study set can chat but cannot extract concepts (extracted concepts need a set and grounded source refs).
