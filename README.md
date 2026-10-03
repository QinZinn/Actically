# Actically

Vietnamese learning workspace. One Next.js App Router application, Supabase Auth/PostgreSQL, Drizzle, FSRS review and server-side NVIDIA Nemotron on Nebius Token Factory. Original product instructions live in `docs/actically-parallel-kit/`; `Actically Mockups.html` is the preserved visual reference.

The backend and AI are integrated, and Codex completed the remaining frontend after the owner authorized takeover following Trae's usage limit. Local typecheck, lint and production build pass; 117 tests pass and two opt-in live tests are skipped. Browser interaction/layout checks and real Supabase/Nebius checks remain unverified. See [integration handoff](docs/handoffs/integration.md), root Board.md, [ownership](docs/OWNERSHIP.md), [API contracts](docs/API-CONTRACT.md) and [AI integration](docs/AI-INTEGRATION.md). Missing provider credentials produce an explicit unavailable response.

## Local setup

Node 24, pnpm 11.19.0. The full toolchain uses Node 24 (Vitest 5 has stricter requirements than Next's minimum). Run `pnpm install --frozen-lockfile`, copy `.env.example` to `.env.local`, then `pnpm dev`. Check `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Run production with `pnpm start`. No credentials are required for bootstrap build or mocked AI checks.

Windows Codex bundled tools, when node/pnpm are absent from PATH:

```powershell
$env:PATH = 'C:\Users\zin53\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\zin53\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;' + $env:PATH
pnpm install --frozen-lockfile
```

Workers must run installation in their assigned worktrees. Never share node_modules with the coordinator. TypeScript is pinned to a version accepted by typescript-eslint; the lockfile freezes all resolutions. `pnpm-workspace.yaml` allows only esbuild and unrs-resolver dependency build scripts.

## Database and authentication

Use an existing Supabase project or create one yourself. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to its public browser configuration, DATABASE_URL to its PostgreSQL connection, and APP_URL to the application origin. The backend verifies Supabase getUser on each handler. A service-role API key is not required. Database URLs and the Nebius key stay server-only.

In Supabase Auth, configure the Site URL and permitted redirect `<APP_URL>/auth/callback`. Email/password login/signup is the MVP auth path. Source and practice records are private to the verified user; RLS is an additional read boundary and direct database writes always pass the owner-scoped server services.

After backend integration, apply the committed Drizzle migrations using `pnpm db:migrate`. `drizzle.config.ts` reads `.env.local` on Node 24. Use ONLY this migration authority for application tables/RLS; do not independently paste a competing table schema into the Supabase editor. `pnpm db:generate` is for schema authors making deliberate changes, not routine setup. Review target configuration before running a migration; no existing remote database has been migrated by this agent.

Tests use PGlite with a small Supabase auth/RLS shim and real committed SQL migrations. This verifies PostgreSQL behavior locally and does not establish live Supabase cookie or PostgREST readiness. No production seed is required: create a study set and paste a text source through the product. Synthetic probability fixtures are available only in explicit demo mode and tests.

## AI configuration

Read [AI-USAGE.md](docs/AI-USAGE.md). Set NEBIUS_API_KEY locally, list the authenticated catalog, then set the exact accessible NVIDIA Nemotron ID in NEBIUS_MODEL. No credentials => explicit AI_NOT_CONFIGURED. No alternate model/provider is used. Optional `pnpm test:ai:live` requires ACTICALLY_LIVE_AI=true and configured credentials; it performs bounded synthetic checks. Routine `pnpm test` skips live generation.

## Explicit demo mode

Set NEXT_PUBLIC_DEMO_MODE=true before starting/building to select the visibly labelled demo client. Demo data is isolated in memory, and reload can reset it. It never serves as a production API failure fallback or proof of persistence. Set the flag false for authenticated real-data mode. NEXT_PUBLIC values are compiled into the browser bundle: rebuild after deployment configuration changes.

## Manual Node deployment

On a Node 24 server/container, install with the frozen pnpm lockfile, supply build-time public Supabase configuration and NEXT_PUBLIC_DEMO_MODE=false, run `pnpm build`, then `pnpm start` behind your HTTPS reverse proxy. Provide DATABASE_URL/NEBIUS_API_KEY/NEBIUS_MODEL/APP_URL via server secrets, configure Supabase callbacks for the final origin, and apply the committed migrations once through the migration authority. Ensure SSE responses are not buffered and the proxy/server timeout exceeds the 60-second AI deadline. Per-user AI quotas use PostgreSQL reservations; process-wide provider concurrency is an extra limit.

No service has been provisioned, purchased, published or deployed automatically. Missing live credentials are unverified external checks, never passed tests. The project owner should review [LICENSE-SUGGESTION.md](docs/LICENSE-SUGGESTION.md) before publication.

## Architecture and validation

[ARCHITECTURE.md](docs/ARCHITECTURE.md), [API-CONTRACT.md](docs/API-CONTRACT.md), [OWNERSHIP.md](docs/OWNERSHIP.md), [INTEGRATION-CHECKLIST.md](docs/INTEGRATION-CHECKLIST.md) and [integration handoff](docs/handoffs/integration.md) describe boundaries, data integrity and exact checks. [ORIGINAL-WORK.md](docs/ORIGINAL-WORK.md) records preserved owner inputs and implementation history. The owner-authorized frontend takeover supersedes the new Trae handoff gate for this repair round. The root remains INTEGRATING until the required browser product checks are recorded; live-service gaps are reported separately.
