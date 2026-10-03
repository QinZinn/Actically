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
  ApiResponse,
  ErrorCode,
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
import { apiErrorSchema } from "@/contracts/dto";
import { chatEventSchema } from "@/contracts/sse";
import { ActicallyClientError, fromApiError } from "./errors";

export default class HttpAdapter implements ActicallyClient {
  private base: string;

  constructor(base: string = "/api/v1") {
    this.base = base.replace(/\/$/, "");
  }

  private async request<T>(
    path: string,
    opts: {
      method?: string;
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined | null>;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    const method = opts.method ?? "GET";
    let url = `${this.base}/${path.replace(/^\//, "")}`;
    if (opts.query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(opts.query)) {
        if (v === undefined || v === null) continue;
        params.append(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const init: RequestInit = {
      method,
      credentials: "include",
      headers,
      signal: opts.signal,
    };
    if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, init);
    const ct = res.headers.get("content-type") ?? "";
    const isJson = ct.includes("application/json");
    if (res.ok) {
      if (!isJson) return undefined as T;
      const json = (await res.json()) as ApiResponse<T>;
      return json.data;
    }
    if (isJson) {
      try {
        const json: unknown = await res.json();
        const parsed = apiErrorSchema.safeParse(json);
        if (parsed.success) {
          throw fromApiError(parsed.data.error);
        }
        const jsonObj = json as Record<string, unknown> | undefined | null;
        const rawErr = jsonObj?.error as Record<string, unknown> | undefined;
        if (
          rawErr &&
          typeof rawErr.code === "string" &&
          typeof rawErr.message === "string"
        ) {
          const codes = [
            "UNAUTHENTICATED",
            "FORBIDDEN",
            "NOT_FOUND",
            "VALIDATION_ERROR",
            "CONFLICT",
            "RATE_LIMITED",
            "AI_NOT_CONFIGURED",
            "AI_MODEL_UNAVAILABLE",
            "AI_INVALID_OUTPUT",
            "AI_TIMEOUT",
            "AI_CANCELLED",
            "AI_PROVIDER_ERROR",
            "SERVICE_UNAVAILABLE",
            "INTERNAL_ERROR",
          ] as const satisfies readonly ErrorCode[];
          const typedCode: ErrorCode = codes.includes(rawErr.code as ErrorCode)
            ? (rawErr.code as ErrorCode)
            : "INTERNAL_ERROR";
          throw new ActicallyClientError({
            code: typedCode,
            message: rawErr.message,
            requestId: typeof rawErr.requestId === "string" ? rawErr.requestId : "unknown",
            retryable: typeof rawErr.retryable === "boolean" ? rawErr.retryable : false,
          });
        }
      } catch (err) {
        if (err instanceof ActicallyClientError) throw err;
      }
    }
    throw new ActicallyClientError({
      code: "INTERNAL_ERROR",
      message: `HTTP ${res.status} ${res.statusText}`,
      requestId: res.headers.get("x-request-id") ?? "unknown",
      retryable: res.status >= 500,
    });
  }

  private listQueryParams(query?: ListQuery & { status?: string; q?: string }) {
    return {
      studySetId: query?.studySetId,
      limit: query?.limit,
      offset: query?.offset,
      status: query?.status,
      q: query?.q,
    };
  }

  async getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>("profile");
  }

  async updateProfile(input: ProfileUpdate): Promise<UserProfile> {
    return this.request<UserProfile>("profile", { method: "PATCH", body: input });
  }

  async listStudySets(): Promise<StudySet[]> {
    return this.request<StudySet[]>("study-sets");
  }

  async createStudySet(input: StudySetCreate): Promise<StudySet> {
    return this.request<StudySet>("study-sets", { method: "POST", body: input });
  }

  async updateStudySet(id: string, input: StudySetUpdate): Promise<StudySet> {
    return this.request<StudySet>(`study-sets/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
  }

  async deleteStudySet(id: string): Promise<void> {
    return this.request<void>(`study-sets/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async listSources(studySetId: string): Promise<Source[]> {
    return this.request<Source[]>("sources", { query: { studySetId } });
  }

  async createSource(studySetId: string, input: SourceCreate): Promise<Source> {
    return this.request<Source>(`study-sets/${encodeURIComponent(studySetId)}/sources`, { method: "POST", body: input });
  }

  async updateSource(id: string, input: SourceUpdate): Promise<Source> {
    return this.request<Source>(`sources/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
  }

  async deleteSource(id: string): Promise<void> {
    return this.request<void>(`sources/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async listSessions(query?: ListQuery): Promise<LearningSession[]> {
    return this.request<LearningSession[]>("sessions", { query: this.listQueryParams(query) });
  }

  async getSession(id: string): Promise<LearningSession> {
    return this.request<LearningSession>(`sessions/${encodeURIComponent(id)}`);
  }

  async createSession(input: SessionCreate): Promise<LearningSession> {
    return this.request<LearningSession>("sessions", { method: "POST", body: input });
  }

  async updateSession(id: string, input: SessionUpdate): Promise<LearningSession> {
    return this.request<LearningSession>(`sessions/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
  }

  async deleteSession(id: string): Promise<void> {
    return this.request<void>(`sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async listMessages(sessionId: string): Promise<Message[]> {
    return this.request<Message[]>(`sessions/${encodeURIComponent(sessionId)}/messages`);
  }

  async *streamChat(
    sessionId: string,
    input: ChatRequest,
    signal?: AbortSignal,
  ): AsyncIterable<ChatEvent> {
    const url = `${this.base}/sessions/${encodeURIComponent(sessionId)}/messages/stream`;
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(input),
      signal,
    });
    if (!res.ok || !res.body) {
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        try {
          const json = await res.json();
          const parsed = apiErrorSchema.safeParse(json);
          if (parsed.success) throw fromApiError(parsed.data.error);
        } catch (e) {
          if (e instanceof ActicallyClientError) throw e;
        }
      }
      throw new ActicallyClientError({
        code: "INTERNAL_ERROR",
        message: `HTTP ${res.status} ${res.statusText}`,
        requestId: res.headers.get("x-request-id") ?? "unknown",
        retryable: res.status >= 500,
      });
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    try {
      while (true) {
        if (signal?.aborted) return;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = rawEvent.split("\n").filter((l) => l.length > 0);
          let eventType: string | undefined;
          let dataStr: string | undefined;
          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice("event: ".length).trim();
            else if (line.startsWith("data: ")) dataStr = line.slice("data: ".length);
          }
          if (!eventType || dataStr === undefined) continue;
          let data: unknown;
          try {
            data = JSON.parse(dataStr);
          } catch {
            continue;
          }
          const parsed = chatEventSchema.safeParse({ event: eventType, data });
          if (!parsed.success) continue;
          const event = parsed.data;
          if (event.event === "error") {
            throw new ActicallyClientError({
              code: event.data.code,
              message: event.data.message,
              requestId: event.data.requestId,
              retryable: event.data.retryable,
            });
          }
          yield event;
          if (signal?.aborted) return;
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // ignore
      }
    }
  }

  async finishSession(sessionId: string, input: ExtractionRequest): Promise<ExtractionResult> {
    return this.request<ExtractionResult>(
      `sessions/${encodeURIComponent(sessionId)}/finish`,
      { method: "POST", body: input },
    );
  }

  async listAttempts(query?: ListQuery): Promise<PracticeAttempt[]> {
    return this.request<PracticeAttempt[]>("practice-attempts", { query: this.listQueryParams(query) });
  }

  async getAttempt(id: string): Promise<PracticeDetail> {
    return this.request<PracticeDetail>(`practice-attempts/${encodeURIComponent(id)}`);
  }

  async createAttempt(input: PracticeCreate): Promise<PracticeAttempt> {
    return this.request<PracticeAttempt>("practice-attempts", { method: "POST", body: input });
  }

  async evaluateAttempt(id: string, signal?: AbortSignal): Promise<PracticeEvaluation> {
    return this.request<PracticeEvaluation>(
      `practice-attempts/${encodeURIComponent(id)}/evaluate`,
      { method: "POST", signal },
    );
  }

  async retryAttempt(id: string, input: PracticeRetry): Promise<PracticeAttempt> {
    return this.request<PracticeAttempt>(
      `practice-attempts/${encodeURIComponent(id)}/retry`,
      { method: "POST", body: input },
    );
  }

  async listConcepts(query?: ListQuery & { status?: Concept["status"] }): Promise<Concept[]> {
    return this.request<Concept[]>("concepts", { query: this.listQueryParams(query) });
  }

  async createConcept(input: ConceptCreate): Promise<Concept> {
    return this.request<Concept>("concepts", { method: "POST", body: input });
  }

  async updateConcept(id: string, input: ConceptUpdate): Promise<Concept> {
    return this.request<Concept>(`concepts/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
  }

  async deleteConcept(id: string): Promise<void> {
    return this.request<void>(`concepts/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async generateCard(input: CardGenerate): Promise<Flashcard> {
    return this.request<Flashcard>("flashcards/generate", { method: "POST", body: input });
  }

  async listCards(query?: ListQuery): Promise<Flashcard[]> {
    return this.request<Flashcard[]>("flashcards", { query: this.listQueryParams(query) });
  }

  async updateCard(id: string, input: CardUpdate): Promise<Flashcard> {
    return this.request<Flashcard>(`flashcards/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
  }

  async deleteCard(id: string): Promise<void> {
    return this.request<void>(`flashcards/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async getDueQueue(query?: ListQuery): Promise<ReviewPresentation[]> {
    return this.request<ReviewPresentation[]>("review/due", { query: this.listQueryParams(query) });
  }

  async gradeCard(cardId: string, input: GradeRequest): Promise<GradeResult> {
    return this.request<GradeResult>(
      `flashcards/${encodeURIComponent(cardId)}/grade`,
      { method: "POST", body: input },
    );
  }

  async getProgress(): Promise<TopicProgress[]> {
    return this.request<TopicProgress[]>("progress/topics");
  }

  async search(query: string): Promise<SearchResult> {
    return this.request<SearchResult>("search", { query: { q: query } });
  }
}
