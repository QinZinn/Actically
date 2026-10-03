# Actically ownership and bootstrap routes

Canonical project: `C:\Users\zin53\Projects\Actically`. Shared instructions are in `docs/actically-parallel-kit/`; preserve these files and `Actically Mockups.html`. Boards are untracked, physically at the canonical root, one writer each. Worker checkouts must not contain their own Board copies.

| Owner | Paths |
| --- | --- |
| Trae Solo | `src/app/(workspace)/**`, `src/app/(auth)/login/**`, `src/app/globals.css`, `src/components/**`, `src/features/**`, `src/lib/client/**`, `tests/frontend/**`, frontend assets, `docs/handoffs/frontend.md` |
| Claude Code | `src/app/api/**`, `src/app/auth/**`, `src/server/services/**`, `src/server/repositories/**`, `src/server/auth/**`, `src/db/**`, `tests/backend/**`, `docs/handoffs/backend.md` |
| Codex | `src/contracts/**`, `src/server/ai/**`, `src/server/composition.ts`, `src/proxy.ts`, `src/app/layout.tsx`, package manifest/lockfile, shared config, `.env.example`, `scripts/**`, `tests/ai/**`, `tests/integration/**`, shared docs, README |

Only Codex changes dependencies, config or contracts. Request changes with a unique Board ID; apply isolated shared commits only after saving your work. Do not edit another checkout. During INTEGRATING, workers freeze and Codex can repair integrated code.

## Frozen routing and auth boundary

- `/` exists only at `src/app/(workspace)/page.tsx`. No `src/app/page.tsx`.
- Workspace URLs: `/`, `/practice`, `/review`, `/knowledge`, `/progress`, `/settings`, `/sessions/[id]` inside `(workspace)`.
- `/login` is `src/app/(auth)/login/page.tsx`; Trae owns email/password login/signup using the browser Supabase client. Honest unavailable state if public env is absent. Authenticated redirect goes to `/`.
- `/auth/callback` belongs to Claude; exchange code with server Supabase and restrict `next` to local relative paths. Redirect `/` on success or `/login?error=auth` on failure.
- `src/proxy.ts` refreshes cookies only. Each server handler independently verifies `getUser()` and resource ownership. UI route guarding is a frontend concern; API authorization is never delegated to UI/proxy.
- Demo requires `NEXT_PUBLIC_DEMO_MODE=true`, an obvious label, a mock client adapter, and no production persistence claims.
- `src/server/composition.ts` exports `getAiLearningService()`. Backend can inject the interface in service tests; never implement another provider.

Workers install their own node_modules using `pnpm install --frozen-lockfile`; the lockfile is shared, node_modules is not. Leave worktrees available after handoff. Handoff requires final SHA, clean/dirty state, test results, known gaps and READY_FOR_INTEGRATION; then freeze.
