# Integration handoff — in progress

Status: **NOT INTEGRATED**. This file records progress, not a completed product claim. The coordinator is awaiting valid frozen final worker handoffs and repairing cross-layer issues through Boards.

Canonical root: `C:\Users\zin53\Projects\Actically`. Original instructions: `docs/actically-parallel-kit/`. Preserved mockup: `Actically Mockups.html` (SHA-256 `BFBF4D855CF77671739291B1AA624FDB5B27121E92DE983226C974A3006258F2`). Original documents/mockup and worker-created decode helpers have been left in place, outside the app bootstrap commits.

## Commits and handoff gates

- Bootstrap: `f57486857d8122b52120bb4ec6c22dab4210e6b5`, both worker worktrees created from this exact SHA; BOOTSTRAP_READY published before full provider implementation.
- Compatible contract patch: `084367a23223df1f6926ce7504e5e9f1eb5d7874` (1.0.1, manual concept cards).
- Drizzle authority config: `c64b6b1a4b53eff2316fef93801a5313a9e7dcf3`.
- AI implementation: `6f87385801089c84be11b3ee5fd5935db4af29b5`, all six service operations, metadata and bounded provider/evidence checks.
- Verified runtime requirement: `8764870a29786e50c1280a1a99f5a66e2947ee6b` (Node 24).
- Trae: `agent/frontend`, `.worktrees/frontend`, WORKING; no final handoff yet.
- Claude: `agent/backend`, `.worktrees/backend`, WORKING repair round. Earlier handoff `8e9f82378140bf7a14560c27e372f36de88e22a3` is explicitly superseded and must not be merged as a frozen target.

## Checks actually executed so far

Coordinator scaffold + provider: typecheck PASS, lint PASS, production build PASS, peer compatibility PASS, **24 offline tests PASS**, **2 live tests SKIPPED**. Tests cover trust boundaries, model/provider config, catalog matching, structured schemas, source/concept/quote/revision/offset integrity, mode behavior, hidden trace handling, truncation, retry/429, abort/timeout/concurrency, neutral evidence and approved card provenance.

Catalog CLI with absent configuration returns AI_NOT_CONFIGURED without a call. These results do not establish live NVIDIA Nemotron quality or account capability. Backend's first handoff reports 26 backend PGlite tests passed, but its repair round must be retested before integration.

Browser reference inspection at `http://127.0.0.1:4317/` was **denied by the browser permission policy**. The agent did not use an alternate browser/CDP/shell workaround; the read-only preview helper was stopped. Screenshot/layout interaction checks have NOT run. Static mockup/source inspection is separate from browser validation.

## Open integration work

Root Board tracks CODEX-BE-002..007: historical context sources, abort/preparation cleanup, bounded body reads, persistent generation dedupe, append-only review history and full chat retry payload. CODEX-FE-002..003: HTTP path parity, honest JSON/SSE failures and cancellation. Await acknowledgements and newly tested frozen handoffs.

Then verify actual heads and dirty states, merge normally into a clean coordinator integration branch, run cross-layer client→HTTP→verified-user shim→PostgreSQL→actual provider with mock transport, and exercise the persisted learning loop. Finish integrated typecheck/lint/build and authorized browser desktop/narrow checks. Update this handoff with exact merge heads/results and remaining external gaps.

## Unexecuted external checks

No local NEBIUS_API_KEY/NEBIUS_MODEL/DATABASE_URL/public Supabase configuration was present. Live account catalog, generation/schema/streaming/educational quality, real Supabase auth/cookies/migration/PostgREST RLS and live persisted browser journey remain **UNVERIFIED**. No paid resources, remote migrations, publishing, deployment or submission have been performed. Keep both worktrees available.

If this turn ends before handoffs: “Read C:\Users\zin53\Projects\Actically\Board.md and all coordination/*/Board.md; continue 03-CODEX.md, finish open requests, verify new frozen handoff SHAs, integrate with ordinary merges, then run and record the complete product checks.” Do not replace the independent workers or infer readiness from elapsed time.
