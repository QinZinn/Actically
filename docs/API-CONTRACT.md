# Actically API contract — 1.0.3

Revision 1.0.3 adds authenticated `POST /sessions/:id/messages/cancel` and the SSE response header `X-Actically-Generation` (ISO UTC). The adapter uses this generation token internally; ActicallyClient signatures and SSE event shapes remain unchanged. Deploy the adapter and handlers together.

Revision 1.0.2 adds optional nullable Message.requestContext `{ mode, followUpStep }`, preserving the original operation for retry after history reload. New backend messages should populate it; old fixtures/records remain valid without it. Retry reuses the paired user message content/requestId plus this context, never generates a new requestId. Missing legacy context should prompt a fresh user action rather than pretend an identical retry. All client signatures remain unchanged.

Revision 1.0.1 is backward compatible: AI flashcard sourceRefs may be empty only for an approved manually authored concept with no source provenance. Provider verifies that generated sourceRefs match the approved concept and supplied source snapshots. DTOs/client methods are unchanged.

Executable authority: `src/contracts/index.ts` (Zod 4 strict schemas + inferred DTOs), `client.ts` (ActicallyClient). Every nullable field is explicit; `solve` is null for non-Solve messages. No body userId. IDs are opaque strings; timestamps ISO UTC. API namespace `/api/v1`. JSON success `{ data: T }`, errors `{ error: { code, message, requestId, retryable } }`; DELETE returns `{ data: null }`. Client adapters unwrap data and throw typed errors. Do not change response shape in a worker branch.

Authenticated identity comes from verified Supabase getUser, with owner filtering on all IDs, parent links, snapshots, search and joins. Cross-user/not-found resources both return 404. Zod rejects unknown input keys. Limit body to 128 KiB. List query: `studySetId?`, `limit?` (1–100, default 50), `offset?` (0–10000); concepts also `status?`. Lists return arrays; clients can page via offset.

| Method / path | Request schema | data / client method |
| --- | --- | --- |
| GET /profile | — | UserProfile / getProfile |
| PATCH /profile | profileUpdateSchema | UserProfile / updateProfile |
| GET /study-sets | — | StudySet[] / listStudySets |
| POST /study-sets | studySetCreateSchema | StudySet / createStudySet |
| PATCH /study-sets/:id | studySetUpdateSchema | StudySet / updateStudySet |
| DELETE /study-sets/:id | — | null / deleteStudySet |
| GET /study-sets/:id/sources | — | Source[] / listSources |
| POST /study-sets/:id/sources | sourceCreateSchema | Source / createSource |
| PATCH /sources/:id | sourceUpdateSchema | Source / updateSource |
| DELETE /sources/:id | — | null / deleteSource |
| GET /sessions | list query | LearningSession[] / listSessions |
| GET /sessions/:id | — | LearningSession / getSession |
| POST /sessions | sessionCreateSchema | LearningSession / createSession |
| PATCH /sessions/:id | sessionUpdateSchema | LearningSession / updateSession |
| DELETE /sessions/:id | — | null / deleteSession |
| GET /sessions/:id/messages | — | Message[] / listMessages |
| POST /sessions/:id/messages/stream | chatRequestSchema | SSE / streamChat |
| POST /sessions/:id/messages/cancel | chatCancelSchema: requestId + generationAt | Message / internal streamChat acknowledgement |
| POST /sessions/:id/finish | extractionRequestSchema | ExtractionResult / finishSession |
| GET /practice-attempts | list query | PracticeAttempt[] / listAttempts |
| POST /practice-attempts | practiceCreateSchema | PracticeAttempt / createAttempt |
| GET /practice-attempts/:id | — | PracticeDetail / getAttempt |
| POST /practice-attempts/:id/evaluate | empty body | PracticeEvaluation / evaluateAttempt |
| POST /practice-attempts/:id/retry | practiceRetrySchema | new PracticeAttempt / retryAttempt |
| GET /concepts | list query + status | Concept[] / listConcepts |
| POST /concepts | conceptCreateSchema | pending Concept / createConcept |
| PATCH /concepts/:id | conceptUpdateSchema | Concept / updateConcept (approve/reject through status) |
| DELETE /concepts/:id | — | null / deleteConcept |
| POST /cards/generate | cardGenerateSchema | Flashcard / generateCard |
| GET /cards | list query | Flashcard[] / listCards |
| PATCH /cards/:id | cardUpdateSchema | Flashcard / updateCard |
| DELETE /cards/:id | — | null / deleteCard |
| GET /review/due | list query | ReviewPresentation[] / getDueQueue |
| POST /cards/:id/grade | gradeRequestSchema | GradeResult / gradeCard |
| GET /progress | — | TopicProgress[] / getProgress |
| GET /search?q= | trimmed query 1–200 chars | SearchResult / search |

Request examples and exact field constraints are the schemas in `requests.ts`. Profile uses validated IANA timezone (default `Asia/Ho_Chi_Minh`). Revisions prevent lost edits on sources, sets, concepts and cards. Practice references use approved concept IDs AND exact revisions; backend preserves immutable reference snapshots before evaluation. Retry creates a distinct attempt linked by retryOfId. Generated cards require approval and the expected concept revision; repeated key replays the original result and regeneration updates the one active generated card.

## Streaming, cancellation and safe retry

POST SSE `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`; no buffering. Browser fetch + AbortController, not EventSource. `src/contracts/sse.ts` validates each event and encodes it as `event: name\ndata: JSON\n\n`.

1. `meta`: `{ requestId, sessionId, userMessageId, assistantMessageId }`, server assigns message IDs, persists user message + pending assistant before calling AI.
2. `delta`: `{ requestId, text }`, learner-facing text only. UI accumulates transient content.
3. `done`: `{ requestId, message }`, exactly one completed Message after schema-valid result AND successful persistence. Structured Solve calls service.solve and emits a validated done message, optionally a readable delta. UI renders message.solve steps.
4. `error`: `{ code, message, requestId, retryable }`. Before SSE headers, errors are ordinary HTTP JSON. After headers, use this event.

User Hủy queues cancellation until persisted meta, then sends an independently bounded cancellation POST with requestId and the response header's generationAt. The server atomically marks that owned, matching generation cancelled. Only a confirmed cancelled DTO becomes UI cancelled/AbortError; an acknowledgement failure becomes a typed error asking for a reload. If completion won the database race, the completed DTO is authoritative and still appears as done. A stale cancellation cannot mutate a newer pending/streaming retry (409).

After acknowledgement the adapter aborts its private SSE transport; provider cleanup still uses request.signal and finally. Hosts may delay disconnect propagation, so the old provider/quota slot can remain occupied until cleanup or the existing 60-second operation timeout. Cancelled persistence is protected independently. Closing the page before persisted meta is received cannot guarantee the queued POST was sent. Adapter bounds: 70 seconds for transport, 10 seconds waiting for meta after Hủy, and 10 seconds for the acknowledgement.

Provider failure marks failed. Retrying SAME requestId and identical content/mode/followUpStep reuses user/assistant IDs and replaces the failed/cancelled response; different payload with the same key is 409. A completed replay emits meta+done without a provider call. Retry claims compare the previously read timestamp and advance it monotonically. Completion/failure writes compare the generation timestamp as well as streaming status, so an old provider cannot overwrite a retry. No silent demo fallback.

Finish extraction is deduped by user+session+idempotencyKey and creates pending concepts only. Cards/attempts use idempotencyKey. Grading requires a server-issued presentationId bound to user/card/revision; same idempotency key returns the stored result. The update + append-only review event are atomic, stale/double presentation grades conflict. UI shows grades only after reveal; API does not trust UI as authorization.

HTTP errors: 401 UNAUTHENTICATED, 404 NOT_FOUND, 400 VALIDATION_ERROR, 409 CONFLICT, 429 RATE_LIMITED, 503 AI_NOT_CONFIGURED/AI_MODEL_UNAVAILABLE/SERVICE_UNAVAILABLE, 502 AI_PROVIDER_ERROR/AI_INVALID_OUTPUT, 504 AI_TIMEOUT. Never expose provider response bodies, DB internals, credentials or learner text in errors/logs.

Progress policy `reviews-v1`: last five reviews of each active card; weak ≥2 Again, solid requires five reviews with ≥4 Good/Easy and no Again. Topic weak if any eligible card weak; solid only ≥3 active cards all solid; growing if any evidence, otherwise nodata. Return review evidence/sample counts and separate AI observations; no fabricated percentages.
