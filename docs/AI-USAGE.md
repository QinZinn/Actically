# NVIDIA Nemotron on Nebius Token Factory

The only provider is Nebius Token Factory's official OpenAI-compatible v1 endpoint. The server uses standard fetch rather than a second SDK layer; this matches Nebius's documented JavaScript wire API. Only an exact NVIDIA Nemotron model ID accessible to the configured account is accepted. No model selector or automatic fallback exists.

## Configure and verify

1. Copy `.env.example` to `.env.local`. Set NEBIUS_API_KEY locally or in server deployment secrets. Never paste secrets into Boards, source, screenshots or logs.
2. List accessible models using Node 24: `node --env-file-if-exists=.env.local scripts/list-nebius-models.mjs`. This is a read-only catalog call, not an inference/capability test. Set NEBIUS_MODEL to one exact returned NVIDIA Nemotron ID.
3. Optionally set ACTICALLY_LIVE_AI=true and run `pnpm test:ai:live`. This sends only synthetic educational fixtures and is bounded to five generation calls (plus catalog checks and at most one retry on transient failures). It verifies structured Solve, Socratic streaming and relative feedback quality for correct/partial/incorrect answers. It does not verify Supabase auth/persistence. Leave the flag false for routine offline tests.
4. Unsupported schema/stream requests and unavailable catalog models produce explicit errors; the application does not substitute another provider or pretend a successful evaluation.

Missing credentials => AI_NOT_CONFIGURED. Incorrect provider/model configuration => AI_MODEL_UNAVAILABLE. Runtime checks query the account catalog before first generation, then cache positive accessibility for five minutes. Accessibility does not guarantee generation access, billing or model-specific capabilities; successful inference must be tested separately.

## Safety and educational behavior

Prompts and schema names are versioned at `actically-learning-v1` / `actically-ai-v1`; executable output schemas live in contracts. Backend should store the prompt version and configured model with evaluations, without API credentials. Socratic asks one focused question; Ask gives a concise answer; Solve returns numbered teaching steps and a comprehension check, including contextual step follow-up. No hidden reasoning is returned. Dedicated provider reasoning_content is ignored and explicit reasoning tags in content are rejected.

Feynman scores clarity/completeness/accuracy 1–10 only with evidence. Blurting distinguishes correct, missing and incorrect findings: omissions have no fabricated learner quote, misconceptions cite real learner text. Exact source/concept IDs, revisions, excerpts and quote offsets are verified. Insufficient references yield neutral output and no scores. These assessments are learning feedback, not a scientific certification of mastery.

Extraction requires grounded source snapshots and produces pending concepts only. Flashcards require a selected approved concept; all source/revision provenance is retained. An approved manually authored concept with no source refs can generate a card grounded in its body with empty refs. Semantic correctness beyond evidence integrity remains a model-evaluation concern, tested separately from mocks.

Bounded context: ≤20 source snapshots, ≤30 approved concept snapshots, ≤24 history messages, 16,000 learner/message characters, 48,000 total serialized context characters. Output: 4,096 completion tokens, ≤32,000 streamed content characters, ≤256 KiB provider response. Operation deadline: 60 seconds across catalog, retry and generation. Process cap: 4 operations; no unbounded queue. One retry, only before output on transport/429/5xx, then safe typed error. Model refusal, truncation, invalid JSON/schema/evidence or incomplete SSE never count as success.

Backend must enforce 20 authenticated-user AI operations per 10 minutes and at most 2 active requests per user using database reservations with expiry. Frontend cancellation travels through HTTP AbortSignal to Nebius. Partial/failed/cancelled messages cannot be saved as completed success. Provider never logs raw learner material or responses, and public errors contain only safe Vietnamese text.

## Verified documentation and current gaps

- [Quickstart/base URL](https://docs.tokenfactory.nebius.com/quickstart)
- [Authenticated model catalog](https://docs.tokenfactory.nebius.com/api-reference/models/list-models)
- [Chat completion wire format and stream flag](https://docs.tokenfactory.nebius.com/api-reference/inference/create-chat-completion)
- [JSON schema response format and model-specific support](https://docs.tokenfactory.nebius.com/ai-models-inference/json)

Documentation checked 2026-10-03. No Nebius key/model or Supabase database/auth configuration was present during offline implementation. Live account catalog, generation, model-specific schema/stream capability and educational quality are UNVERIFIED until explicitly configured and tested. Offline fixtures/mock transports prove code behavior and validation, not actual Nemotron performance.
