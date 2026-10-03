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
  topicProgress as fixtureTopicProgress,
  reviewPresentations as fixturePresentations,
  extractionResult as fixtureExtractionResult,
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

  constructor() {
    this.profile = { ...fixtureProfile, connections: { ...fixtureProfile.connections } };
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

  private buildSolveResult(): SolveResult {
    return {
      steps: [
        {
          number: 1,
          action: "Đặt ký hiệu các biến cố",
          explanation: "Dựa vào đề bài, xác định các tập hợp và biến cố liên quan, viết lại rõ |Ω| và các đại lượng.",
          principle: "Mô hình hóa bài toán xác suất thành các biến cố.",
        },
        {
          number: 2,
          action: "Nhận dạng yêu cầu",
          explanation: "Xác định đây là xác suất có điều kiện P(A|B), xác định điều kiện B.",
          principle: "Định nghĩa P(A|B) = P(A∩B)/P(B).",
        },
        {
          number: 3,
          action: "Tính P(B) và P(A∩B)",
          explanation: "Đếm số phần tử hoặc dùng các xác suất đã có, viết dưới dạng phân số.",
          principle: "Định nghĩa cổ điển.",
        },
        {
          number: 4,
          action: "Áp dụng công thức",
          explanation: "Thay số vào và rút gọn phân số.",
          principle: "Công thức xác suất có điều kiện.",
        },
        {
          number: 5,
          action: "Kết luận",
          explanation: "Trình bày kết quả cuối cùng bằng lời tự nhiên.",
          principle: "Diễn giải kết quả.",
        },
      ],
      comprehensionCheck: "Nếu tăng số học sinh thích cả hai lên 8 thì P(Đ|C) đổi bao nhiêu?",
      sourceRefs: [{ sourceId: "fx-src-1", revision: 1, excerpt: "P(A|B) = P(A ∩ B) / P(B)." }],
    };
  }

  async *streamChat(
    sessionId: string,
    input: ChatRequest,
    signal?: AbortSignal,
  ): AsyncIterable<ChatEvent> {
    const sess = this.sessions.find((s) => s.id === sessionId);
    if (!sess) notFound("LearningSession", sessionId);

    const requestId = input.requestId;
    const userMessageId = "m-u-" + uuidv4().slice(0, 8);
    const assistantMessageId = "m-a-" + uuidv4().slice(0, 8);

    const mode = input.mode ?? sess.mode;

    yield {
      event: "meta",
      data: { requestId, sessionId, userMessageId, assistantMessageId },
    };

    await new Promise((r) => setTimeout(r, 20));

    if (signal?.aborted) return;

    let assistantContent = "";
    if (mode === "socratic") {
      assistantContent = "Đây là câu hỏi gợi ý để em tự suy nghĩ nhé: Em có thể mô tả lại không gian mẫu trong bài toán này, và nêu rõ điều kiện gì đã biết để áp dụng công thức xác suất có điều kiện không?";
    } else if (mode === "solve") {
      assistantContent = "Chào em, đây là bài giải chi tiết từng bước:\n\n1. Đặt ký hiệu các biến cố tương ứng với đề bài.\n2. Nhận dạng đây là bài toán xác suất có điều kiện.\n3. Tính các xác suất thành phần.\n4. Áp dụng công thức P(A|B) = P(A∩B)/P(B).\n5. Rút gọn và kết luận.\n\nKết quả cuối cùng được trình bày rõ ràng bên dưới.";
    } else {
      assistantContent = "Trả lời ngắn gọn: Xác suất có điều kiện P(A|B) đo khả năng A xảy ra khi biết B đã xảy ra, công thức là P(A|B) = P(A∩B) / P(B) với P(B) > 0. Nó khác P(B|A), đừng nhầm lẫn nhé.";
    }

    const chunks = assistantContent.match(/.{1,30}/gs) ?? [assistantContent];
    for (const chunk of chunks) {
      if (signal?.aborted) return;
      yield { event: "delta", data: { requestId, text: chunk } };
      await new Promise((r) => setTimeout(r, 10));
    }

    if (signal?.aborted) return;

    const now = NOW();
    const userMsg: Message = {
      id: userMessageId,
      sessionId,
      role: "user",
      content: input.content,
      status: "completed",
      solve: null,
      requestId,
      createdAt: now,
      updatedAt: now,
    };
    const asstMsg: Message = {
      id: assistantMessageId,
      sessionId,
      role: "assistant",
      content: assistantContent,
      status: "completed",
      solve: mode === "solve" ? this.buildSolveResult() : null,
      requestId,
      createdAt: now,
      updatedAt: now,
    };
    this.messages.push(userMsg, asstMsg);

    yield { event: "done", data: { requestId, message: asstMsg } };
  }

  async finishSession(sessionId: string, input: ExtractionRequest): Promise<ExtractionResult> {
    const key = `finish:${input.idempotencyKey}`;
    if (this.idempotency.has(key)) return delay({ ...(this.idempotency.get(key) as ExtractionResult) });
    const sess = this.sessions.find((s) => s.id === sessionId);
    if (!sess) notFound("LearningSession", sessionId);
    const idx = this.sessions.findIndex((s) => s.id === sessionId);
    this.sessions[idx] = { ...sess, status: "ended", updatedAt: NOW() };
    this.idempotency.set(key, { ...fixtureExtractionResult });
    return delay({ ...fixtureExtractionResult });
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
    if (this.idempotency.has(key)) return delay({ ...(this.idempotency.get(key) as PracticeAttempt) });
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
              sufficientEvidence: true,
              summary: "Bài trình bày tương đối rõ. Cần bổ sung thêm ví dụ tính toán cụ thể.",
              observations: [],
              scores: { clarity: 6, completeness: 5, accuracy: 5 },
            }
          : {
              kind: "blurting",
              sufficientEvidence: true,
              summary: "Nhớ được phần lớn các ý chính, còn thiếu một vài chi tiết nhỏ.",
              observations: [],
              correct: [],
              missing: [],
              incorrect: [],
            },
      promptVersion: "review-spec-v1",
      model: "gpt-demo-mock",
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
    const key = `generateCard:${input.idempotencyKey}`;
    if (this.idempotency.has(key)) return delay({ ...(this.idempotency.get(key) as Flashcard) });
    const concept = this.concepts.find((c) => c.id === input.conceptId);
    if (!concept) notFound("Concept", input.conceptId);
    if (input.expectedConceptRevision !== concept.revision) conflict("revision mismatch");
    const now = NOW();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const c: Flashcard = {
      id: uuidv4(),
      conceptId: concept.id,
      studySetId: concept.studySetId,
      front: concept.title,
      back: concept.body.slice(0, 500),
      sourceRefs: concept.sourceRefs.map((r) => ({ ...r })),
      revision: 1,
      scheduler: {
        due: dueDate.toISOString(),
        stability: 1,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 1,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        last_review: null,
      },
      createdAt: now,
      updatedAt: now,
    };
    this.cards.push(c);
    this.idempotency.set(key, {
      ...c,
      sourceRefs: c.sourceRefs.map((r) => ({ ...r })),
      scheduler: { ...c.scheduler },
    });
    return delay({
      ...c,
      sourceRefs: c.sourceRefs.map((r) => ({ ...r })),
      scheduler: { ...c.scheduler },
    });
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
    let list = fixturePresentations.slice();
    if (query?.studySetId) list = list.filter((p) => p.card.studySetId === query.studySetId);
    if (typeof query?.offset === "number") list = list.slice(query.offset);
    if (typeof query?.limit === "number") list = list.slice(0, query.limit);
    return delay(list.map((p) => ({
      ...p,
      card: {
        ...p.card,
        sourceRefs: p.card.sourceRefs.map((r) => ({ ...r })),
        scheduler: { ...p.card.scheduler },
      },
    })));
  }

  async gradeCard(cardId: string, input: GradeRequest): Promise<GradeResult> {
    const key = `gradeCard:${input.idempotencyKey}`;
    if (this.idempotency.has(key)) return delay({ ...(this.idempotency.get(key) as GradeResult) });
    const idx = this.cards.findIndex((c) => c.id === cardId);
    if (idx < 0) notFound("Flashcard", cardId);
    const cur = this.cards[idx];
    if (input.expectedRevision !== cur.revision) conflict("revision mismatch");
    const now = NOW();
    const newDue = new Date();
    const multiplier = input.rating === "again" ? 0.5 : input.rating === "hard" ? 1.2 : input.rating === "good" ? 2.5 : 5;
    newDue.setDate(newDue.getDate() + Math.max(1, Math.round(cur.scheduler.scheduled_days * multiplier)));
    const next: Flashcard = {
      ...cur,
      revision: cur.revision + 1,
      updatedAt: now,
      sourceRefs: cur.sourceRefs.map((r) => ({ ...r })),
      scheduler: {
        ...cur.scheduler,
        due: newDue.toISOString(),
        reps: cur.scheduler.reps + 1,
        lapses: cur.scheduler.lapses + (input.rating === "again" ? 1 : 0),
        last_review: now,
        state: (input.rating === "again" ? 1 : Math.min(3, cur.scheduler.state + 1)) as 0 | 1 | 2 | 3,
        scheduled_days: Math.round(cur.scheduler.scheduled_days * multiplier) || 1,
      },
    };
    this.cards[idx] = next;
    this.reviewEvents.push({
      id: uuidv4(),
      cardId,
      presentationId: input.presentationId,
      rating: input.rating,
      reviewedAt: now,
      revisionBefore: cur.revision,
      revisionAfter: next.revision,
    });
    const result: GradeResult = { cardId, revision: next.revision, dueAt: next.scheduler.due };
    this.idempotency.set(key, { ...result });
    return delay({ ...result });
  }

  async getProgress(): Promise<TopicProgress[]> {
    return delay(fixtureTopicProgress.map((t) => ({
      ...t,
      reviewEvidence: t.reviewEvidence.map((e) => ({ ...e })),
      assessmentObservations: t.assessmentObservations.map((o) => ({ ...o })),
    })));
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
