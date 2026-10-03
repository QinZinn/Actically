# NVIDIA Nemotron / Nebius boundary

The backend calls `AiLearningService` through `getAiLearningService()` in `src/server/composition.ts`. Contracts in `src/contracts/ai.ts` are frozen at 1.0.0. The bootstrap implementation throws typed AI_NOT_CONFIGURED; no provider calls or fake answers. Tests inject a double. Codex supplies the live provider in a subsequent commit; workers do not wait for it.

Backend owns authenticated authorization, persistent per-user rate limits, source/concept ownership and exact revisions, approved-concept gating, requests/attempts BEFORE AI, cancellations and atomic success persistence. AI receives backend-verified source snapshots (`sourceId`, `revision`, `title`, `content`), approved concept snapshots, requestId and AbortSignal. It does not authenticate, query/write a DB or trust user-supplied IDs. Feynman/Blurting retain old snapshots after source edits. `streamChat` yields delta/done; backend maps to the public SSE and assigns/persists IDs. Solve is structured JSON through `solve`; pass `previousSolve` + `followUpStep` for elaboration of a specific step.

Provider configuration is server-only: NEBIUS_API_KEY, NEBIUS_MODEL, official `https://api.tokenfactory.nebius.com/v1/`. Choose one exact NVIDIA Nemotron ID from the account's /models result, never substitute another provider/model. Credentials absent => unavailable. Model accessibility, inference and model-specific structured-output/streaming capabilities are separate live checks; documentation alone cannot prove account access.

Official references checked 2026-10-03:
- [Nebius quickstart](https://docs.tokenfactory.nebius.com/quickstart): OpenAI-compatible v1 base URL.
- [List models](https://docs.tokenfactory.nebius.com/api-reference/models/list-models): account catalog.
- [Structured output](https://docs.tokenfactory.nebius.com/ai-models-inference/json): JSON/schema API.
- [Chat completions](https://docs.tokenfactory.nebius.com/api-reference/inference/create-chat-completion): generation/streaming.
- [Nebius maintained workbench](https://github.com/nebius/nebius-physical-ai/blob/main/docs/workbench/token-factory.md): current documented example `nvidia/Nemotron-3_5-Lightning`, explicitly not guaranteed for every account. NEBIUS_MODEL stays blank until catalog verification.

Persistent authenticated-user limiting required in backend: reserve a per-user request slot before every AI operation (including evaluation/extraction/cards), enforce a bounded rolling window (initial policy 20 operations/10 minutes and at most 2 in flight per user); release in finally, recover stale reservations after timeout. Database implementation belongs to Claude. Provider global in-process concurrency is an additional ceiling, not a substitute for per-user persistent limits.

Output must satisfy Zod AND semantic evidence checks: real learner substrings/offsets; concept IDs and revisions from selected approved snapshots; real source excerpt substrings for the exact source revision. Insufficient evidence returns neutral observations/nullable scores, not an invented grade. Source/learner text is untrusted evidence; versioned system prompts forbid following embedded instructions, revealing secrets or hidden reasoning. Return learner-facing educational explanations only.

Planned bounds: 16k learner chars, 48k total context chars, 24 history messages, 30 concept snapshots, 20 source snapshots, 4096 completion tokens, 60-second total operation timeout, one retry only before output on transient failures, 4 process-wide concurrent operations. Reject oversized context; never silently drop historical evidence. Provider uses standard fetch/AbortSignal and the documented wire format, avoiding an unnecessary SDK dependency.
