# Actically

Vietnamese learning workspace. One Next.js App Router application, Supabase Auth/PostgreSQL, Drizzle, FSRS review and server-side NVIDIA Nemotron on Nebius Token Factory. Original product instructions live in `docs/actically-parallel-kit/`; `Actically Mockups.html` is the preserved visual reference.

Bootstrap is under active parallel development. Initial pages and AI service honestly report unavailable integration. See root Board.md for live coordination, docs/OWNERSHIP.md for boundaries, docs/API-CONTRACT.md for executable contracts and docs/AI-INTEGRATION.md for provider safety.

## Local setup

Node 24 LTS (minimum 20.9), pnpm 11.19.0. Run `pnpm install --frozen-lockfile`, copy `.env.example` to `.env.local`, then `pnpm dev`. Check `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Run production with `pnpm start`. No credentials are required for bootstrap build or mocked AI checks.

Windows Codex bundled tools, when node/pnpm are absent from PATH:

```powershell
$env:PATH = 'C:\Users\zin53\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\zin53\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;' + $env:PATH
pnpm install --frozen-lockfile
```

Workers must run installation in their assigned worktrees. Never share node_modules with the coordinator. TypeScript is pinned to a version accepted by typescript-eslint; the lockfile freezes all resolutions. `pnpm-workspace.yaml` allows only esbuild and unrs-resolver dependency build scripts.

Supabase migration/seed and complete deployment/demo guidance are supplied at integration. Missing live credentials are reported as unverified external checks, never as passed tests. Do not publish, deploy, provision or submit automatically.
