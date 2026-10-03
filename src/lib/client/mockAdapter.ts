import * as requestSchemas from "@/contracts/requests";
import { createEmptyCard } from "ts-fsrs";
import { scheduler, RATINGS, toState, fromState, presentationIdOf, endOfLocalDay } from "@/lib/review-logic";
import { cardStatus, topicStatus, POLICY_VERSION } from "@/lib/progress-policy";
import type { ActicallyClient, ListQuery } from "@/contracts/client";
import type {
  UserProfile,
  StudySet,
  Source,
  Concept,
  LearningSession,
  Message,
  PracticeAttempt,
  PracticeDetail,
  PracticeEvaluation,
  Flashcard,
  ReviewPresentation,
  GradeResult,
  TopicProgress,
  SearchResult,
  ExtractionResult,
  ErrorCode,
  SolveResult,
} from "@/contracts/dto";
import type {
  ProfileUpdate,
  StudySetCreate,
  StudySetUpdate,
  SourceCreate,
  SourceUpdate,
  SessionCreate,
  SessionUpdate,
  ChatRequest,
  ExtractionRequest,
  PracticeCreate,
  PracticeRetry,
  ConceptCreate,
  ConceptUpdate,
  CardGenerate,
  CardUpdate,
  GradeRequest,
} from "@/contracts/requests";
import type { ChatEvent } from "@/contracts/sse";
import {
  userProfile as fixtureProfile,
  studySets as fixtureStudySets,
  sources as fixtureSources,
  concepts as fixtureConcepts,
  sessions as fixtureSessions,
  messages as fixtureMessages,
  practiceAttempts as fixtureAttempts,
  practiceEvaluations as fixtureEvaluations,
  flashcards as fixtureCards,
  reviewEvents as fixtureReviewEvents,



} from "./fixtures";
import { ActicallyClientError } from "./errors";
import { uuidv4 } from "./utils";

type IdempotencyStore = Map<string, unknown>;

function notFound(resource: string, id: string): never {
  throw new ActicallyClientError({
    code: "NOT_FOUND",
    message: `${resource} with id ${id} not found`,
    requestId: uuidv4(),
    retryable: false,
  });
}

function conflict(message: string): never {
  throw new ActicallyClientError({
    code: "CONFLICT" as ErrorCode,
    message,
    requestId: uuidv4(),
    retryable: false,
  });
}

function delay<T>(value: T, ms = 30): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const NOW = () => new Date().toISOString();

export default class MockAdapter implements ActicallyClient {
  private profile: UserProfile;
  private studySets: StudySet[];
  private sources: Source[];
  private concepts: Concept[];
  private sessions: LearningSession[];
  private messages: Message[];
  private attempts: PracticeAttempt[];
  private evaluations: PracticeEvaluation[];
  private cards: Flashcard[];
  private reviewEvents: typeof fixtureReviewEvents;
  private idempotency: IdempotencyStore;
  private payloads = new Map<string, string>();
  private checkPayload(key: string, input: unknown) {
    const payload = JSON.stringify(input), previous = this.payloads.get(key);
    if (previous && previous !== payload) conflict("Khóa đã dùng với nội dung khác.");
    this.payloads.set(key, payload);
  }

  constructor() {
    this.profile = { ...fixtureProfile, connections: { database: "unavailable", ai: "unavailable" } };
    this.studySets = fixtureStudySets.map((s) => ({ ...s }));
    this.sources = fixtureSources.map((s) => ({ ...s }));
    this.concepts = fixtureConcepts.map((c) => ({ ...c, sourceRefs: c.sourceRefs.map((r) => ({ ...r })) }));
    this.sessions = fixtureSessions.map((s) => ({ ...s }));
    this.messages = fixtureMessages.map((m) => ({ ...m, solve: m.solve ? { ...m.solve, steps: m.solve.steps.map((s) => ({ ...s })), sourceRefs: m.solve.sourceRefs.map((r) => ({ ...r })) } : null }));
    this.attempts = fixtureAttempts.map((a) => ({ ...a, referenceSnapshots: a.referenceSnapshots.map((r) => ({ ...r })) }));
    this.evaluations = fixtureEvaluations.map((e) => ({ ...e }));
    this.cards = fixtureCards.map((c) => ({
      ...c,
      sourceRefs: c.sourceRefs.map((r) => ({ ...r })),
      scheduler: { ...c.scheduler },
    }));
    this.reviewEvents = fixtureReviewEvents.map((e) => ({ ...e }));
    this.idempotency = new Map();
  }

  async getProfile(): Promise<UserProfile> {
    return delay({ ...this.profile });
  }

  async updateProfile(input: ProfileUpdate): Promise<UserProfile> {
    this.profile = { ...this.profile, ...input, updatedAt: NOW() };
    return delay({ ...this.profile });
  }

  async listStudySets(): Promise<StudySet[]> {
    return delay(this.studySets.map((s) => ({ ...s })));
  }

  async createStudySet(input: StudySetCreate): Promise<StudySet> {
    const now = NOW();
    const ss: StudySet = {
      id: uuidv4(),
      subject: input.subject,
      title: input.title,
      description: input.description ?? "",
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.studySets.push(ss);
    return delay({ ...ss });
  }

  async updateStudySet(id: string, input: StudySetUpdate): Promise<StudySet> {
    const idx = this.studySets.findIndex((s) => s.id === id);
    if (idx < 0) notFound("StudySet", id);
    const cur = this.studySets[idx];
    if (input.expectedRevision !== cur.revision) conflict("revision mismatch");
    const next: StudySet = {
      ...cur,
      subject: input.subject ?? cur.subject,
      title: input.title ?? cur.title,
      description: input.description ?? cur.description,
      revision: cur.revision + 1,
      updatedAt: NOW(),
    };
    this.studySets[idx] = next;
    return delay({ ...next });
  }

  async deleteStudySet(id: string): Promise<void> {
    const idx = this.studySets.findIndex((s) => s.id === id);
    if (idx < 0) notFound("StudySet", id);
    this.studySets.splice(idx, 1);
    this.sources = this.sources.filter((s) => s.studySetId !== id);
    this.concepts = this.concepts.filter((c) => c.studySetId !== id);
    this.cards = this.cards.filter((c) => c.studySetId !== id);
    this.sessions = this.sessions.map(s => s.studySetId === id ? { ...s, studySetId: null, updatedAt: NOW() } : s);
    return delay(undefined);
  }

  async listSources(studySetId: string): Promise<Source[]> {
    return delay(this.sources.filter((s) => s.studySetId === studySetId).map((s) => ({ ...s })));
  }

  async createSource(studySetId: string, input: SourceCreate): Promise<Source> {
    if (!this.studySets.some((s) => s.id === studySetId)) notFound("StudySet", studySetId);
    const now = NOW();
    const src: Source = {
      id: uuidv4(),
      studySetId,
      title: input.title,
      content: input.content,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.sources.push(src);
    return delay({ ...src });
  }

  async updateSource(id: string, input: SourceUpdate): Promise<Source> {
    const idx = this.sources.findIndex((s) => s.id === id);
    if (idx < 0) notFound("Source", id);
    const cur = this.sources[idx];
    if (input.expectedRevision !== cur.revision) conflict("revision mismatch");
    const next: Source = {
      ...cur,
      title: input.title ?? cur.title,
      content: input.content ?? cur.content,
      revision: cur.revision + 1,
      updatedAt: NOW(),
    };
    this.sources[idx] = next;
    return delay({ ...next });
  }

  async deleteSource(id: string): Promise<void> {
    const idx = this.sources.findIndex((s) => s.id === id);
    if (idx < 0) notFound("Source", id);
    this.sources.splice(idx, 1);
    return delay(undefined);
  }

  async listSessions(query?: ListQuery): Promise<LearningSession[]> {
    let list = this.sessions.slice();
    if (query?.studySetId) list = list.filter((s) => s.studySetId === query.studySetId);
    if (typeof query?.offset === "number") list = list.slice(query.offset);
    if (typeof query?.limit === "number") list = list.slice(0, query.limit);
    return delay(list.map((s) => ({ ...s })));
  }

  async getSession(id: string): Promise<LearningSession> {
    const s = this.sessions.find((x) => x.id === id);
    if (!s) notFound("LearningSession", id);
    return delay({ ...s });
  }

  async createSession(input: SessionCreate): Promise<LearningSession> {
    const now = NOW();
    const sess: LearningSession = {
      id: uuidv4(),
      studySetId: input.studySetId ?? null,
      title: input.title,
      mode: input.mode,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.push(sess);
    return delay({ ...sess });
  }

  async updateSession(id: string, input: SessionUpdate): Promise<LearningSession> {
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (idx < 0) notFound("LearningSession", id);
    const cur = this.sessions[idx];
    const next: LearningSession = {
      ...cur,
      title: input.title ?? cur.title,
      mode: input.mode ?? cur.mode,
      studySetId: input.studySetId !== undefined ? input.studySetId : cur.studySetId,
      updatedAt: NOW(),
    };
    this.sessions[idx] = next;
    return delay({ ...next });
  }

  async deleteSession(id: string): Promise<void> {
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (idx < 0) notFound("LearningSession", id);
    this.sessions.splice(idx, 1);
    this.messages = this.messages.filter((m) => m.sessionId !== id);
    return delay(undefined);
  }

  async listMessages(sessionId: string): Promise<Message[]> {
    return delay(this.messages.filter((m) => m.sessionId === sessionId).map((m) => ({
      ...m,
      solve: m.solve ? { ...m.solve, steps: m.solve.steps.map((s) => ({ ...s })), sourceRefs: m.solve.sourceRefs.map((r) => ({ ...r })) } : null,
    })));
  }

  private buildSolveResult(session: LearningSession): SolveResult {
    const source = this.sources.find(s => s.studySetId === session.studySetId);
    return { steps: [
      { number: 1, action: "Đọc đề và xác định dữ kiện", explanation: "Đây là bước giải mẫu trong chế độ mô phỏng.", principle: "Làm rõ điều đã biết và yêu cầu." },
      { number: 2, action: "Chọn nguyên lý phù hợp", explanation: "Đối chiếu nguyên lý với nguồn đã liên kết.", principle: "Dùng bằng chứng tham chiếu." },
      { number: 3, action: "Kiểm tra kết quả", explanation: "Thử áp dụng lại nguyên lý và kiểm tra điều kiện.", principle: "Kiểm tra tính nhất quán." },
    ], comprehensionCheck: "Hãy giải thích vì sao nguyên lý này phù hợp với đề bài.",
      sourceRefs: source ? [{ sourceId: source.id, revision: source.revision, excerpt: source.content.slice(0, 4000) }] : [] };
  }

  async *streamChat(sessionId: string, input: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
    const sess = this.sessions.find(s => s.id === sessionId);
    if (!sess) notFound("LearningSession", sessionId);
    this.checkPayload("chat:" + input.requestId, { sessionId, ...requestSchemas.chatRequestSchema.parse(input) });
    if (sess.status === "ended") conflict("Phiên đã kết thúc");
    if (signal?.aborted) throw signal.reason;
    let user = this.messages.find(m => m.requestId === input.requestId && m.role === "user");
    let assistant = this.messages.find(m => m.requestId === input.requestId && m.role === "assistant");
    if (!user || !assistant) {
      const base = { sessionId, requestId: input.requestId, requestContext: { mode: input.mode, followUpStep: input.followUpStep },
        solve: null, createdAt: NOW(), updatedAt: NOW() };
      user = { ...base, id: uuidv4(), role: "user", content: input.content, status: "completed" };
      assistant = { ...base, id: uuidv4(), role: "assistant", content: "", status: "streaming" };
      this.messages.push(user, assistant);
    }
    const reply = assistant;
    yield { event: "meta", data: { requestId: input.requestId, sessionId, userMessageId: user.id, assistantMessageId: reply.id } };
    if (reply.status === "completed") { yield { event: "done", data: { requestId: input.requestId, message: structuredClone(reply) } }; return; }
    reply.content = ""; reply.status = "streaming";
    const answer = input.mode === "socratic" ? "Phản hồi mẫu: Bạn đã biết những dữ kiện nào? Hãy thử nêu nguyên lý và giải thích bằng lời của mình." :
      input.mode === "solve" ? "Bài giải mẫu để minh họa giao diện. Các bước được trình bày bên dưới." :
        "Phản hồi mẫu: Hãy đối chiếu câu hỏi với nguồn và các khái niệm đã duyệt. Chế độ mẫu không gọi mô hình AI.";
    try {
      for (const chunk of answer.match(/.{1,30}/gs) ?? []) {
        signal?.throwIfAborted();
        reply.content += chunk;
        yield { event: "delta", data: { requestId: input.requestId, text: chunk } };
        await delay(undefined, 10);
      }
      signal?.throwIfAborted();
      reply.status = "completed"; reply.solve = input.mode === "solve" ? this.buildSolveResult(sess) : null; reply.updatedAt = NOW();
      yield { event: "done", data: { requestId: input.requestId, message: structuredClone(reply) } };
    } finally {
      if (reply.status !== "completed") { reply.status = signal?.aborted ? "cancelled" : "failed"; reply.updatedAt = NOW(); }
    }
  }

  async finishSession(sessionId: string, input: ExtractionRequest): Promise<ExtractionResult> {
    const key = "finish:" + input.idempotencyKey;
    this.checkPayload(key, { sessionId });
    if (this.idempotency.has(key)) return delay(structuredClone(this.idempotency.get(key) as ExtractionResult));
    const sess = this.sessions.find(s => s.id === sessionId);
    if (!sess) notFound("LearningSession", sessionId);
    if (!sess.studySetId) throw new ActicallyClientError({ code: "VALIDATION_ERROR", message: "Chọn bộ học trước khi trích xuất.", requestId: uuidv4(), retryable: false });
    const source = this.sources.find(s => s.studySetId === sess.studySetId);
    const userMessage = this.messages.find(m => m.sessionId === sessionId && m.role === "user");
    const concepts: Concept[] = sess.studySetId && userMessage ? [{
      id: uuidv4(), studySetId: sess.studySetId, title: source?.title ?? sess.title,
      body: source?.content.slice(0, 8000) ?? userMessage.content.slice(0, 8000),
      sourceRefs: source ? [{ sourceId: source.id, revision: source.revision, excerpt: source.content.slice(0, 4000) }] : [],
      status: "pending", revision: 1, createdAt: NOW(), updatedAt: NOW(),
    }] : [];
    const normalize = (title: string) => title.normalize("NFKC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
    const duplicateWarnings = concepts.flatMap(candidate => this.concepts
      .filter(c => c.studySetId === sess.studySetId && c.status !== "rejected" && normalize(c.title) === normalize(candidate.title))
      .map(c => ({ title: candidate.title, existingConceptId: c.id })));
    this.concepts.push(...concepts);
    sess.status = "ended"; sess.updatedAt = NOW();
    const result = { concepts, duplicateWarnings };
    this.idempotency.set(key, structuredClone(result));
    return delay(structuredClone(result));
  }

  async listAttempts(query?: ListQuery): Promise<PracticeAttempt[]> {
    let list = this.attempts.slice();
    if (query?.studySetId) list = list.filter((a) => a.studySetId === query.studySetId);
    if (typeof query?.offset === "number") list = list.slice(query.offset);
    if (typeof query?.limit === "number") list = list.slice(0, query.limit);
    return delay(list.map((a) => ({ ...a, referenceSnapshots: a.referenceSnapshots.map((r) => ({ ...r })) })));
  }

  async getAttempt(id: string): Promise<PracticeDetail> {
    const attempt = this.attempts.find((a) => a.id === id);
    if (!attempt) notFound("PracticeAttempt", id);
    const evaluation = this.evaluations.find((e) => e.attemptId === id) ?? null;
    return delay({
      attempt: { ...attempt, referenceSnapshots: attempt.referenceSnapshots.map((r) => ({ ...r })) },
      evaluation: evaluation ? { ...evaluation } : null,
    });
  }

  async createAttempt(input: PracticeCreate): Promise<PracticeAttempt> {
    const key = `createAttempt:${input.idempotencyKey}`;
    this.checkPayload(key, requestSchemas.practiceCreateSchema.parse(input));
    if (this.idempotency.has(key)) return delay({ ...(this.idempotency.get(key) as PracticeAttempt) });
    if (!this.studySets.some(s => s.id === input.studySetId)) notFound("StudySet", input.studySetId);
    for (const ref of input.referenceSnapshots) {
      const c = this.concepts.find(c => c.id === ref.conceptId);
      if (!c || c.studySetId !== input.studySetId || c.status !== "approved" || c.revision !== ref.revision) conflict("Tham chiếu khái niệm không còn hợp lệ.");
    }
    const now = NOW();
    const a: PracticeAttempt = {
      id: uuidv4(),
      kind: input.kind,
      studySetId: input.studySetId,
      learnerText: input.learnerText,
      referenceSnapshots: input.referenceSnapshots.map((r) => ({ ...r })),
      status: "submitted",
      retryOfId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.attempts.push(a);
    this.idempotency.set(key, { ...a, referenceSnapshots: a.referenceSnapshots.map((r) => ({ ...r })) });
    return delay({ ...a, referenceSnapshots: a.referenceSnapshots.map((r) => ({ ...r })) });
  }

  async evaluateAttempt(id: string, signal?: AbortSignal): Promise<PracticeEvaluation> {
    const att = this.attempts.find((a) => a.id === id);
    if (!att) notFound("PracticeAttempt", id);
    const existing = this.evaluations.find((e) => e.attemptId === id);
    if (existing) return delay({ ...existing });
    if (signal?.aborted) {
      throw new ActicallyClientError({
        code: "AI_CANCELLED",
        message: "Evaluation aborted by signal",
        requestId: uuidv4(),
        retryable: true,
      });
    }
    await new Promise((r) => setTimeout(r, 50));
    if (signal?.aborted) {
      throw new ActicallyClientError({
        code: "AI_CANCELLED",
        message: "Evaluation aborted by signal",
        requestId: uuidv4(),
        retryable: true,
      });
    }
    const now = NOW();
    const ev: PracticeEvaluation = {
      id: uuidv4(),
      attemptId: id,
      result:
        att.kind === "feynman"
          ? {
              kind: "feynman",
              sufficientEvidence: false,
              summary: "Nhận xét mẫu: chưa gọi mô hình AI để đối chiếu bằng chứng và đánh giá bài viết.",
              observations: [],
              scores: { clarity: null, completeness: null, accuracy: null },
            }
          : {
              kind: "blurting",
              sufficientEvidence: false,
              summary: "Nhận xét mẫu: chưa gọi mô hình AI để đối chiếu nội dung nhớ lại với bằng chứng.",
              observations: [],
              correct: [],
              missing: [],
              incorrect: [],
            },
      promptVersion: "review-spec-v1",
      model: "actically-demo",
      createdAt: now,
    };
    this.evaluations.push(ev);
    const attIdx = this.attempts.findIndex((a) => a.id === id);
    if (attIdx >= 0) {
      this.attempts[attIdx] = { ...this.attempts[attIdx], status: "evaluated", updatedAt: now };
    }
    return delay({ ...ev });
  }

  async retryAttempt(id: string, input: PracticeRetry): Promise<PracticeAttempt> {
    const key = `retryAttempt:${input.idempotencyKey}`;
    this.checkPayload(key, { id, ...requestSchemas.practiceRetrySchema.parse(input) });
    if (this.idempotency.has(key)) return delay({ ...(this.idempotency.get(key) as PracticeAttempt) });
    const prev = this.attempts.find((a) => a.id === id);
    if (!prev) notFound("PracticeAttempt", id);
    const now = NOW();
    const a: PracticeAttempt = {
      id: uuidv4(),
      kind: prev.kind,
      studySetId: prev.studySetId,
      learnerText: input.learnerText,
      referenceSnapshots: prev.referenceSnapshots.map((r) => ({ ...r })),
      status: "submitted",
      retryOfId: id,
      createdAt: now,
      updatedAt: now,
    };
    this.attempts.push(a);
    this.idempotency.set(key, { ...a, referenceSnapshots: a.referenceSnapshots.map((r) => ({ ...r })) });
    return delay({ ...a, referenceSnapshots: a.referenceSnapshots.map((r) => ({ ...r })) });
  }

  async listConcepts(query?: ListQuery & { status?: Concept["status"] }): Promise<Concept[]> {
    let list = this.concepts.slice();
    if (query?.studySetId) list = list.filter((c) => c.studySetId === query.studySetId);
    if (query?.status) list = list.filter((c) => c.status === query.status);
    if (typeof query?.offset === "number") list = list.slice(query.offset);
    if (typeof query?.limit === "number") list = list.slice(0, query.limit);
    return delay(list.map((c) => ({ ...c, sourceRefs: c.sourceRefs.map((r) => ({ ...r })) })));
  }

  async createConcept(input: ConceptCreate): Promise<Concept> {
    const now = NOW();
    const c: Concept = {
      id: uuidv4(),
      studySetId: input.studySetId,
      title: input.title,
      body: input.body,
      status: "pending",
      sourceRefs: input.sourceRefs.map((r) => ({ ...r })),
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.concepts.push(c);
    return delay({ ...c, sourceRefs: c.sourceRefs.map((r) => ({ ...r })) });
  }

  async updateConcept(id: string, input: ConceptUpdate): Promise<Concept> {
    const idx = this.concepts.findIndex((c) => c.id === id);
    if (idx < 0) notFound("Concept", id);
    const cur = this.concepts[idx];
    if (input.expectedRevision !== cur.revision) conflict("revision mismatch");
    const next: Concept = {
      ...cur,
      title: input.title ?? cur.title,
      body: input.body ?? cur.body,
      status: input.status ?? cur.status,
      sourceRefs: input.sourceRefs !== undefined ? input.sourceRefs.map((r) => ({ ...r })) : cur.sourceRefs.map((r) => ({ ...r })),
      revision: cur.revision + 1,
      updatedAt: NOW(),
    };
    this.concepts[idx] = next;
    return delay({ ...next, sourceRefs: next.sourceRefs.map((r) => ({ ...r })) });
  }

  async deleteConcept(id: string): Promise<void> {
    const idx = this.concepts.findIndex((c) => c.id === id);
    if (idx < 0) notFound("Concept", id);
    this.concepts.splice(idx, 1);
    this.cards = this.cards.filter((c) => c.conceptId !== id);
    return delay(undefined);
  }

  async generateCard(input: CardGenerate): Promise<Flashcard> {
    const key = "generateCard:" + input.idempotencyKey;
    this.checkPayload(key, requestSchemas.cardGenerateSchema.parse(input));
    if (this.idempotency.has(key)) {
      const prior = this.idempotency.get(key) as Flashcard;
      const current = this.cards.find(c => c.id === prior.id);
      if (!current) notFound("Flashcard", prior.id);
      return delay(structuredClone(current));
    }
    const concept = this.concepts.find(c => c.id === input.conceptId);
    if (!concept) notFound("Concept", input.conceptId);
    if (concept.status !== "approved") throw new ActicallyClientError({ code: "VALIDATION_ERROR", message: "Khái niệm cần được duyệt.", requestId: uuidv4(), retryable: false });
    if (input.expectedConceptRevision !== concept.revision) conflict("revision mismatch");
    const old = this.cards.find(c => c.conceptId === concept.id);
    const card: Flashcard = { id: old?.id ?? uuidv4(), conceptId: concept.id, studySetId: concept.studySetId,
      front: concept.title, back: concept.body, sourceRefs: structuredClone(concept.sourceRefs),
      revision: (old?.revision ?? 0) + 1, scheduler: old?.scheduler ?? toState(createEmptyCard(new Date())),
      createdAt: old?.createdAt ?? NOW(), updatedAt: NOW() };
    this.cards = [...this.cards.filter(c => c.id !== card.id), card];
    this.idempotency.set(key, structuredClone(card));
    return delay(structuredClone(card));
  }

  async listCards(query?: ListQuery): Promise<Flashcard[]> {
    let list = this.cards.slice();
    if (query?.studySetId) list = list.filter((c) => c.studySetId === query.studySetId);
    if (typeof query?.offset === "number") list = list.slice(query.offset);
    if (typeof query?.limit === "number") list = list.slice(0, query.limit);
    return delay(list.map((c) => ({
      ...c,
      sourceRefs: c.sourceRefs.map((r) => ({ ...r })),
      scheduler: { ...c.scheduler },
    })));
  }

  async updateCard(id: string, input: CardUpdate): Promise<Flashcard> {
    const idx = this.cards.findIndex((c) => c.id === id);
    if (idx < 0) notFound("Flashcard", id);
    const cur = this.cards[idx];
    if (input.expectedRevision !== cur.revision) conflict("revision mismatch");
    const next: Flashcard = {
      ...cur,
      front: input.front,
      back: input.back,
      revision: cur.revision + 1,
      updatedAt: NOW(),
      sourceRefs: cur.sourceRefs.map((r) => ({ ...r })),
      scheduler: { ...cur.scheduler },
    };
    this.cards[idx] = next;
    return delay({
      ...next,
      sourceRefs: next.sourceRefs.map((r) => ({ ...r })),
      scheduler: { ...next.scheduler },
    });
  }

  async deleteCard(id: string): Promise<void> {
    const idx = this.cards.findIndex((c) => c.id === id);
    if (idx < 0) notFound("Flashcard", id);
    this.cards.splice(idx, 1);
    return delay(undefined);
  }

  async getDueQueue(query?: ListQuery): Promise<ReviewPresentation[]> {
    const cutoff = endOfLocalDay(new Date(), this.profile.timezone);
    let list = this.cards.filter(c => new Date(c.scheduler.due) < cutoff && (!query?.studySetId || c.studySetId === query.studySetId))
      .sort((a, b) => Date.parse(a.scheduler.due) - Date.parse(b.scheduler.due));
    list = list.slice(query?.offset ?? 0, (query?.offset ?? 0) + (query?.limit ?? 50));
    return delay(list.map(c => ({ card: structuredClone(c), presentationId: presentationIdOf(c.id, c.revision), expectedRevision: c.revision, dueAt: c.scheduler.due })));
  }

  async gradeCard(cardId: string, input: GradeRequest): Promise<GradeResult> {
    const key = "gradeCard:" + input.idempotencyKey;
    this.checkPayload(key, { cardId, ...requestSchemas.gradeRequestSchema.parse(input) });
    if (this.idempotency.has(key)) return delay({ ...(this.idempotency.get(key) as GradeResult) });
    const card = this.cards.find(c => c.id === cardId);
    if (!card) notFound("Flashcard", cardId);
    if (input.expectedRevision !== card.revision || input.presentationId !== presentationIdOf(cardId, card.revision)) conflict("Lượt trình bày thẻ đã thay đổi");
    const now = new Date(), before = card.revision;
    card.scheduler = toState(scheduler.next(fromState(card.scheduler), now, RATINGS[input.rating]).card);
    card.revision++; card.updatedAt = now.toISOString();
    this.reviewEvents.push({ id: uuidv4(), cardId, presentationId: input.presentationId, rating: input.rating,
      reviewedAt: now.toISOString(), revisionBefore: before, revisionAfter: card.revision });
    const result = { cardId, revision: card.revision, dueAt: card.scheduler.due };
    this.idempotency.set(key, result);
    return delay({ ...result });
  }

  async getProgress(): Promise<TopicProgress[]> {
    return delay(this.studySets.map(s => {
      const cards = this.cards.filter(c => c.studySetId === s.id);
      const windows = cards.map(c => this.reviewEvents.filter(e => e.cardId === c.id)
        .sort((a, b) => Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt)).slice(0, 5));
      const statuses = windows.map(w => cardStatus(w.map(e => e.rating)));
      const reviewEvidence = windows.flat().sort((a, b) => Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt));
      const assessmentObservations = this.evaluations.filter(e => this.attempts.some(a => a.id === e.attemptId && a.studySetId === s.id))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 10)
        .map(e => ({ attemptId: e.attemptId, kind: e.result.kind, summary: e.result.summary, sufficientEvidence: e.result.sufficientEvidence, createdAt: e.createdAt }));
      const latest = Math.max(Date.parse(reviewEvidence[0]?.reviewedAt ?? "") || 0, Date.parse(assessmentObservations[0]?.createdAt ?? "") || 0);
      return { studySetId: s.id, title: s.title, status: topicStatus(statuses), policyVersion: POLICY_VERSION,
        eligibleCardCount: statuses.filter(x => x !== "nodata").length, totalCardCount: cards.length, reviewCount: reviewEvidence.length,
        latestAssessmentAt: latest ? new Date(latest).toISOString() : null, reviewEvidence: structuredClone(reviewEvidence), assessmentObservations };
    }));
  }

  async search(query: string): Promise<SearchResult> {
    const q = query.toLowerCase();
    const sessions = this.sessions.filter(
      (s) => s.title.toLowerCase().includes(q) || s.mode.toLowerCase().includes(q),
    );
    const concepts = this.concepts.filter(
      (c) => c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q),
    );
    return delay({ sessions: sessions.map((s) => ({ ...s })), concepts: concepts.map((c) => ({ ...c, sourceRefs: c.sourceRefs.map((r) => ({ ...r })) })) });
  }
}
