# Frontend takeover — Codex

The owner authorized Codex to finish Trae's remaining frontend after Usage Limit on 2026-10-03. Code commit: `fc04dd70eb788d5c0cbe18b707e8eed47c75980b`, coordinator root on `coordinator/integration`. Backend repair round 2 and AI are integrated. Contract revision remains 1.0.2; dependencies are unchanged.

Trae's historical [frontend handoff](frontend.md) describes its earlier implementation, not the final repaired product. Codex preserved its stopped HEAD `0f53577d5b4072444bafc180a0b5f3899cf4ec1b`, captured ten incomplete tracked edits, ordinary-merged that history and completed the captured work in the root. The frontend worktree and its Board remain unchanged. No replacement frontend worker was created.

## Finished work

- FE-002/003: all typed methods use frozen API namespaces and strict DTO envelopes. JSON/SSE byte bounds, valid UTF-8, correlated terminal events, malformed/truncated errors and abort/reader cleanup are enforced. Production errors never switch to demo.
- FE-004/005: optimistic messages preserve original content/mode/follow-up/requestId before stream metadata; retries reuse the same payload, including after reload. Legacy missing context offers an explicit new send. Cancellation/route cleanup ends streams; finish keys survive failure, and every successful finish ends the session. One shared client powers all features.
- FE-006: Feynman/Blurting use one real study set with approved references. Blurting hides bodies while composing. Create transport retry retains its immutable key/payload; evaluation retry uses the saved attempt; intentional rewrite creates a distinct child with preserved reference history. History loading, errors and stale-response handling are explicit.
- FE-007: profile, recent sessions, search, logout, sidebar collapse and new-session navigation use real operations. Search results link to actual session/concept/history targets. Mobile navigation closes its drawer; context panels render only while open.
- Authentication: browser Supabase SSR client shares cookies with server/proxy; password signup/sign-in and confirmation notices are real flows with honest missing-configuration errors. Demo entry is enabled only by the explicit compiled flag.
- Knowledge/cards: source and study-set CRUD, concept edit/approve/reject/delete, approval-triggered card generation and card list/create/regenerate/edit/delete. Failed generation remains visibly retryable; regeneration updates one active card.
- Review/progress: reveal precedes grading; uncertain retries retain the original presentation/revision/rating/key. Stale/conflicting grades allow reload. Progress and review evidence come from server records, with profile timezone and history links. No invented mastery percentages or scheduling promises.
- Evidence/drafts: exact learner quotations and source revision/excerpt snapshots; safe Markdown/math markup; drafts survive tab/context changes locally without becoming a substitute database.
- Explicit demo: mutable sample operations, payload-validated replay/conflicts, approval and active-card rules, shared FSRS/progress calculations and neutral labelled practice feedback. It makes no production persistence or live AI claims.

## Verification and gaps

Integrated typecheck, lint (zero warnings/errors), production build and 117 tests PASS; two opt-in live tests SKIPPED. Frontend suite: 53 PASS across nine files. Production HttpAdapter also runs through actual API handlers, PGlite migrations and the real provider validator with synthetic transport in integration tests.

Actual browser interactions and responsive screenshots remain pending renewed user permission after a prior denial. SSR assertions do not verify interactive hooks or layout. Real Supabase auth/cookies/RLS and Nebius catalog/generation remain unverified because configuration is absent. See [integration handoff](integration.md) for exact commits, test scope and remaining protocol checks.
