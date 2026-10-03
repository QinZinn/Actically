# Actically architecture

One TypeScript Next.js App Router application. Vietnamese product UI, English setup/judging documents. Original parallel instructions and mockup remain at the canonical root.

```mermaid
flowchart LR
  UI[React workspace] --> Client[ActicallyClient HTTP adapter]
  Client --> API[/api/v1 handlers]
  API --> Auth[Supabase verified user]
  API --> Services[Owner-scoped services]
  Services --> DB[(PostgreSQL via Drizzle)]
  Services --> Rate[Persistent user request reservations]
  Services --> AI[AiLearningService]
  AI --> Nebius[Nebius Token Factory: NVIDIA Nemotron]
  Demo[Explicit demo adapter] --> UI
```

The frontend implements frozen `ActicallyClient`. Production HTTP and explicit demo adapters share DTOs but are deliberately selected; failures never switch production to demo. Safe Markdown/KaTeX rendering belongs to the frontend. Only harmless preferences/drafts can use browser localStorage; production records belong to PostgreSQL.

Each backend route validates strict request schemas, independently verifies Supabase `getUser()` and scopes every operation to its identity. Body-provided user identity is rejected. Direct database connections can bypass RLS, so owner filtering and composite foreign keys remain essential. One Drizzle migration authority manages application tables, constraints and RLS SQL; do not also apply a competing application-table migration set.

Historical source and approved concept revisions are immutable evidence snapshots. Practice attempts are stored before evaluation; feedback refers to exact learner substrings and selected snapshot revisions. Extraction creates pending concepts. Approval precedes generated cards, and one active generated card per concept is enforced. Review grades atomically update FSRS state plus append-only events, with server presentation IDs, idempotency and expected revisions.

AI is independent of database/auth and only consumes verified snapshots. Codex composition selects one Nebius implementation or explicit unavailable implementation. AI has no database writes/tools; secrets stay in server modules and never enter prompts. Backend enforces persistent per-user reservations; provider enforces process concurrency/context/output/time/retry bounds. SSE terminal success is sent only after validated complete output and committed persistence. Disconnect/abort cancels upstream generation; partial output stays failed/cancelled.

Progress uses the documented `reviews-v1` deterministic heuristic and actual recent review history. Feynman/Blurting observations stay separate. No-data is a distinct state, no invented mastery score. UTC instants cross APIs; profile IANA timezone controls learner-facing dates.

No vector database, queue service, Redis, model router or second server is needed for this MVP. Adding infrastructure requires evidence that the current deployment needs it.
