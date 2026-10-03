# Final integration checks

Do not mark the root Board INTEGRATED until the integrated code checks below are recorded. External-service and browser permission gaps remain distinct from local code checks.

## Handoff gate

- Worker explicitly READY_FOR_INTEGRATION, exact final SHA, dirty-state report, tests, known gaps and frozen branch.
- Compare actual branch HEAD to that SHA and read its handoff document. Superseded handoffs are invalid.
- Commit coordinator-owned code, preserve original reference/kit/unrelated files, create a clean coordinator integration branch and use ordinary merges. Recognize identical shared cherry-picks without discarding worker edits.
- When a substantial worker repair is required, issue Board request IDs and await a new frozen handoff. Do not edit worker checkouts.

## Local code/security checks

- Integrated typecheck, lint, production build and meaningful tests.
- Real PostgreSQL semantics via PGlite with migrations; label Supabase authentication shim clearly. Live Supabase remains separate.
- Auth wrapper verifies identity; rejected body userId; cross-user IDs/parents/joins/search/history/callback redirect protection.
- API/client parity, success/error envelopes, all 41 typed methods and nullable fields.
- Card approval gate, active-card uniqueness, concurrent identical-key generation, append-only review history, presentation/revision/idempotency concurrency and UTC/timezone boundaries.
- Persistent per-user AI rates; provider process bounds; quota released after preparation failure, abort and invalid output.
- Source revisions survive edits; exact source/quote IDs and offsets; approved snapshots passed to the actual provider service with a mock transport, rather than bypassing provider validation.
- SSE meta/delta/done/error, transient/failed/cancelled persistence, same-key retry without duplicate user/assistant messages, full payload conflicts, structured Solve and step follow-up.
- Practice persisted before evaluation, distinct retry attempt, invalid evidence rejected, no-evidence neutrality; no fabricated production stats or localStorage database.

## Persisted learning journey

Exercise in one isolated database: create source/set → Socratic → finish/extract pending concepts → approve → generate one card → obtain presentation/reveal/grade → progress evidence → Feynman and Blurting saved attempts → targeted study session → reopen history with a fresh service/client context. Confirm results survive reload/reconstruction, preserve source versions after edits, and remain inaccessible to a second user. Mocked Nebius responses are synthetic educational fixtures and must be labelled; they are not live-model quality evidence.

UI interaction and screenshot checks at 1440×900 and at least one narrow viewport: sidebar 240/64, panel 360, readable Vietnamese/math, keyboard focus, no composer overlap, navigation/back, practice reference hiding, reveal-before-grade, loading/error/cancel/retry and explicit demo label. Browser access to the local reference URL was denied; do not bypass that denial or claim screenshots ran. Run only after an authorized browser surface is available.

## External checks and delivery

With configured local secrets and authorized bounded usage: authenticated account catalog, exact Nemotron model, structured output/streaming and synthetic correct/partial/incorrect live fixture suite; real Supabase signup/sign-in/cookies, migration, RLS via PostgREST and persisted product journey. Credentials must stay out of Board/chat/logs. No paid resource provisioning or publishing/deployment/submission.

English README with local/run/production setup, env placeholders, one migration authority and optional fixture seed, architecture, NVIDIA/Nebius usage notes, demo script, suggested MIT owner review, original-work record and docs/handoffs/integration.md. Keep worktrees available.

## Recorded checkpoint, 2026-10-03

Code `fc04dd70eb788d5c0cbe18b707e8eed47c75980b` integrates accepted backend `b5520ba`, AI and the owner-authorized frontend takeover. This authorization replaces the new Trae repair handoff requirement for this round; worker checkouts remain preserved. Typecheck, lint (zero warnings/errors) and production build PASS; 117 tests PASS / 2 opt-in live tests SKIPPED. Frontend suite repeated after line-ending normalization: 53 PASS. The production HttpAdapter drives actual route handlers/PGlite migrations/real provider validation with synthetic transport.

Required browser interaction/layout checks have not run: after renewed user authorization in chat, the browser tool rejected localhost access again. The temporary server was stopped; no workaround was used. Real Supabase/Nebius configuration is absent, so live cookies/RLS/persistence/catalog/model quality remain unverified. Root remains INTEGRATING. See `docs/handoffs/integration.md` and `docs/handoffs/frontend-takeover.md` for test scope and exact resume steps.
