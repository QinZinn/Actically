import { z } from "zod";
import type { ActicallyClient, ListQuery } from "@/contracts/client";
import type * as Requests from "@/contracts/requests";
import {
  apiErrorSchema, userProfileSchema, studySetSchema, sourceSchema, sessionSchema, messageSchema,
  practiceAttemptSchema, practiceDetailSchema, practiceEvaluationSchema, conceptSchema,
  flashcardSchema, reviewPresentationSchema, gradeResultSchema, topicProgressSchema,
  searchResultSchema, extractionResultSchema, type Concept,
} from "@/contracts/dto";
import { chatEventSchema, type ChatEvent } from "@/contracts/sse";
import { ActicallyClientError, fromApiError } from "./errors";

const empty = z.null().transform(() => undefined);
const protocolError = () => new ActicallyClientError({ code: "INTERNAL_ERROR", message: "Phản hồi máy chủ không hợp lệ hoặc chưa hoàn tất. Hãy thử lại.", requestId: "unknown", retryable: true });
type Options = { method?: string; body?: unknown; query?: Record<string, string | number | undefined>; signal?: AbortSignal };

async function read(reader: ReadableStreamDefaultReader<Uint8Array>, signal?: AbortSignal) {
  signal?.throwIfAborted();
  let abort = () => {};
  try {
    return await Promise.race([reader.read(), new Promise<never>((_, reject) => {
      abort = () => reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
      signal?.addEventListener("abort", abort, { once: true });
    })]);
  } finally { signal?.removeEventListener("abort", abort); }
}
async function jsonBody(response: Response, signal?: AbortSignal): Promise<unknown> {
  if (!response.body || !response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw protocolError();
  const reader = response.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "", bytes = 0;
  try {
    for (;;) {
      const chunk = await read(reader, signal); if (chunk.done) break;
      bytes += chunk.value.byteLength; if (bytes > 8 * 1024 * 1024) throw protocolError();
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (error) { if (signal?.aborted) throw signal.reason; throw error instanceof ActicallyClientError ? error : protocolError(); }
  finally { void reader.cancel().catch(() => {}); }
}
function responseError(json: unknown, status: number): ActicallyClientError {
  const parsed = apiErrorSchema.safeParse(json);
  return parsed.success ? fromApiError(parsed.data.error) : new ActicallyClientError({ code: "INTERNAL_ERROR", message: `Không thể hoàn tất yêu cầu (HTTP ${status}).`, requestId: "unknown", retryable: status >= 500 });
}

export default class HttpAdapter implements ActicallyClient {
  private readonly base: string;
  constructor(base = "/api/v1") { this.base = base.replace(/\/$/, ""); }
  private async request<T>(path: string, schema: z.ZodType<T>, opts: Options = {}): Promise<T> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(opts.query ?? {})) if (value !== undefined) params.set(key, String(value));
    const query = params.size ? `?${params}` : "";
    const response = await fetch(`${this.base}/${path}${query}`, {
      method: opts.method ?? "GET", credentials: "include", signal: opts.signal,
      ...(opts.body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(opts.body) }),
    });
    const json = await jsonBody(response, opts.signal);
    if (!response.ok) throw responseError(json, response.status);
    const parsed = z.strictObject({ data: schema }).safeParse(json);
    if (!parsed.success) throw protocolError();
    return parsed.data.data;
  }
  getProfile() { return this.request("profile", userProfileSchema); }
  updateProfile(body: Requests.ProfileUpdate) { return this.request("profile", userProfileSchema, { method: "PATCH", body }); }
  listStudySets() { return this.request("study-sets", z.array(studySetSchema)); }
  createStudySet(body: Requests.StudySetCreate) { return this.request("study-sets", studySetSchema, { method: "POST", body }); }
  updateStudySet(id: string, body: Requests.StudySetUpdate) { return this.request(`study-sets/${encodeURIComponent(id)}`, studySetSchema, { method: "PATCH", body }); }
  deleteStudySet(id: string) { return this.request(`study-sets/${encodeURIComponent(id)}`, empty, { method: "DELETE" }); }
  listSources(id: string) { return this.request(`study-sets/${encodeURIComponent(id)}/sources`, z.array(sourceSchema)); }
  createSource(id: string, body: Requests.SourceCreate) { return this.request(`study-sets/${encodeURIComponent(id)}/sources`, sourceSchema, { method: "POST", body }); }
  updateSource(id: string, body: Requests.SourceUpdate) { return this.request(`sources/${encodeURIComponent(id)}`, sourceSchema, { method: "PATCH", body }); }
  deleteSource(id: string) { return this.request(`sources/${encodeURIComponent(id)}`, empty, { method: "DELETE" }); }
  listSessions(query?: ListQuery) { return this.request("sessions", z.array(sessionSchema), { query }); }
  getSession(id: string) { return this.request(`sessions/${encodeURIComponent(id)}`, sessionSchema); }
  createSession(body: Requests.SessionCreate) { return this.request("sessions", sessionSchema, { method: "POST", body }); }
  updateSession(id: string, body: Requests.SessionUpdate) { return this.request(`sessions/${encodeURIComponent(id)}`, sessionSchema, { method: "PATCH", body }); }
  deleteSession(id: string) { return this.request(`sessions/${encodeURIComponent(id)}`, empty, { method: "DELETE" }); }
  listMessages(id: string) { return this.request(`sessions/${encodeURIComponent(id)}/messages`, z.array(messageSchema)); }
  async *streamChat(sessionId: string, input: Requests.ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
    const response = await fetch(`${this.base}/sessions/${encodeURIComponent(sessionId)}/messages/stream`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify(input), signal,
    });
    if (!response.ok) throw responseError(await jsonBody(response, signal), response.status);
    if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) throw protocolError();
    const reader = response.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
    let buffer = "", bytes = 0, assistantId: string | null = null;
    try {
      for (;;) {
        const chunk = await read(reader, signal); if (chunk.done) throw protocolError();
        bytes += chunk.value.byteLength; if (bytes > 2 * 1024 * 1024) throw protocolError();
        buffer += decoder.decode(chunk.value, { stream: true });
        if (buffer.length > 1024 * 1024) throw protocolError();
        let boundary: RegExpExecArray | null;
        while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
          const frame = buffer.slice(0, boundary.index); buffer = buffer.slice(boundary.index + boundary[0].length);
          const lines = frame.split(/\r?\n/).filter(line => line && !line.startsWith(":"));
          if (!lines.length) continue;
          const name = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
          const text = lines.filter(line => line.startsWith("data:")).map(line => line.slice(5).replace(/^ /, "")).join("\n");
          let data: unknown; try { data = JSON.parse(text); } catch { throw protocolError(); }
          const parsed = chatEventSchema.safeParse({ event: name, data });
          if (!parsed.success || parsed.data.data.requestId !== input.requestId) throw protocolError();
          const event = parsed.data;
          if (event.event === "error") throw fromApiError(event.data);
          if (event.event === "meta") {
            if (assistantId || event.data.sessionId !== sessionId) throw protocolError();
            assistantId = event.data.assistantMessageId;
          } else if (!assistantId) throw protocolError();
          if (event.event === "done") {
            const message = event.data.message;
            if (message.id !== assistantId || message.sessionId !== sessionId || message.requestId !== input.requestId || message.role !== "assistant" || message.status !== "completed") throw protocolError();
          }
          signal?.throwIfAborted(); yield event;
          if (event.event === "done") return;
        }
      }
    } catch (error) { if (signal?.aborted) throw signal.reason; throw error instanceof ActicallyClientError ? error : protocolError(); }
    finally { void reader.cancel().catch(() => {}); }
  }
  finishSession(id: string, body: Requests.ExtractionRequest) { return this.request(`sessions/${encodeURIComponent(id)}/finish`, extractionResultSchema, { method: "POST", body }); }
  listAttempts(query?: ListQuery) { return this.request("practice-attempts", z.array(practiceAttemptSchema), { query }); }
  getAttempt(id: string) { return this.request(`practice-attempts/${encodeURIComponent(id)}`, practiceDetailSchema); }
  createAttempt(body: Requests.PracticeCreate) { return this.request("practice-attempts", practiceAttemptSchema, { method: "POST", body }); }
  evaluateAttempt(id: string, signal?: AbortSignal) { return this.request(`practice-attempts/${encodeURIComponent(id)}/evaluate`, practiceEvaluationSchema, { method: "POST", signal }); }
  retryAttempt(id: string, body: Requests.PracticeRetry) { return this.request(`practice-attempts/${encodeURIComponent(id)}/retry`, practiceAttemptSchema, { method: "POST", body }); }
  listConcepts(query?: ListQuery & { status?: Concept["status"] }) { return this.request("concepts", z.array(conceptSchema), { query }); }
  createConcept(body: Requests.ConceptCreate) { return this.request("concepts", conceptSchema, { method: "POST", body }); }
  updateConcept(id: string, body: Requests.ConceptUpdate) { return this.request(`concepts/${encodeURIComponent(id)}`, conceptSchema, { method: "PATCH", body }); }
  deleteConcept(id: string) { return this.request(`concepts/${encodeURIComponent(id)}`, empty, { method: "DELETE" }); }
  generateCard(body: Requests.CardGenerate) { return this.request("cards/generate", flashcardSchema, { method: "POST", body }); }
  listCards(query?: ListQuery) { return this.request("cards", z.array(flashcardSchema), { query }); }
  updateCard(id: string, body: Requests.CardUpdate) { return this.request(`cards/${encodeURIComponent(id)}`, flashcardSchema, { method: "PATCH", body }); }
  deleteCard(id: string) { return this.request(`cards/${encodeURIComponent(id)}`, empty, { method: "DELETE" }); }
  getDueQueue(query?: ListQuery) { return this.request("review/due", z.array(reviewPresentationSchema), { query }); }
  gradeCard(id: string, body: Requests.GradeRequest) { return this.request(`cards/${encodeURIComponent(id)}/grade`, gradeResultSchema, { method: "POST", body }); }
  getProgress() { return this.request("progress", z.array(topicProgressSchema)); }
  search(q: string) { return this.request("search", searchResultSchema, { query: { q } }); }
}
