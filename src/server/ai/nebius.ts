import "server-only";
import { z } from "zod";
import { setTimeout as delay } from "node:timers/promises";
import { aiExtractionSchema, aiFlashcardSchema, type AiLearningService, type AiChatInput, type AiPracticeInput, type AiExtractionInput, type AiCardInput, type AiContext, type AiChatEvent } from "@/contracts/ai";
import { solveResultSchema, feynmanResultSchema, blurtingResultSchema } from "@/contracts/dto";
import { AiServiceError } from "./errors";
import { SYSTEM_PROMPT, TASK_PROMPTS } from "./prompts";
import { invalidOutput, validateContext, verifySourceRefs, validateEvaluation, neutralFeynman, neutralBlurting } from "./validation";

export const NEBIUS_ENDPOINT = "https://api.tokenfactory.nebius.com/v1/";
type Config = { apiKey: string; model: string; baseUrl?: string; fetch?: typeof fetch; timeoutMs?: number; maxConcurrency?: number };
const completionSchema = z.object({ choices: z.array(z.object({ finish_reason: z.string().nullable(), message: z.object({ content: z.string().nullable(), refusal: z.string().nullable().optional() }) })).min(1) });
const chunkSchema = z.object({ choices: z.array(z.object({ finish_reason: z.string().nullable().optional(), delta: z.object({ content: z.string().nullable().optional(), refusal: z.string().nullable().optional() }) })) });
const hiddenTrace = /<\s*\/?\s*(?:think|analysis|reasoning)\b/i;

async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>, signal: AbortSignal) {
  signal.throwIfAborted();
  let abort: () => void = () => {};
  try {
    return await Promise.race([reader.read(), new Promise<never>((_, reject) => { abort = () => reject(signal.reason); signal.addEventListener("abort", abort, { once: true }); })]);
  } finally { signal.removeEventListener("abort", abort); }
}
async function boundedText(response: Response, signal: AbortSignal, maxBytes = 262144): Promise<string> {
  if (!response.body) invalidOutput();
  const reader = response.body.getReader(); const decoder = new TextDecoder();
  let text = "", bytes = 0;
  try {
    while (true) { const chunk = await readChunk(reader, signal); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > maxBytes) invalidOutput(); text += decoder.decode(chunk.value, { stream: true }); }
    return text + decoder.decode();
  } finally { void reader.cancel().catch(() => {}); }
}
function parseJson(text: string): unknown { try { return JSON.parse(text); } catch { return invalidOutput(); } }

export class NebiusLearningService implements AiLearningService {
  private readonly fetcher: typeof fetch;
  private inFlight = 0;
  private modelCheckedAt = 0;
  constructor(private readonly config: Config) {
    this.fetcher = config.fetch ?? fetch;
    if (!config.apiKey || !config.model) throw new AiServiceError("AI_NOT_CONFIGURED", "AI chưa được cấu hình.");
    if (!/^nvidia\/[^\s]*nemotron[^\s]*$/i.test(config.model) || (config.baseUrl && config.baseUrl !== NEBIUS_ENDPOINT)) throw new AiServiceError("AI_MODEL_UNAVAILABLE", "Chỉ hỗ trợ NVIDIA Nemotron tại Nebius Token Factory.");
  }
  private begin(input: AiContext, extra: unknown) {
    validateContext(input, extra);
    if (input.signal?.aborted) throw new AiServiceError("AI_CANCELLED", "Yêu cầu đã bị hủy.");
    if (this.inFlight >= (this.config.maxConcurrency ?? 4)) throw new AiServiceError("RATE_LIMITED", "AI đang bận. Vui lòng thử lại sau.", true);
    const timeout = AbortSignal.timeout(this.config.timeoutMs ?? 60000);
    const controller = new AbortController();
    const signal = AbortSignal.any([timeout, controller.signal, ...(input.signal ? [input.signal] : [])]);
    this.inFlight++;
    return { signal, end: () => { controller.abort(); this.inFlight--; } };
  }
  private safeError(error: unknown, input: AiContext, signal: AbortSignal): AiServiceError {
    if (input.signal?.aborted) return new AiServiceError("AI_CANCELLED", "Yêu cầu đã bị hủy.");
    if (signal.aborted) return new AiServiceError("AI_TIMEOUT", "AI phản hồi quá lâu. Vui lòng thử lại.", true);
    return error instanceof AiServiceError ? error : new AiServiceError("AI_PROVIDER_ERROR", "Không thể kết nối AI. Vui lòng thử lại.", true);
  }
  private async request(path: string, body: unknown, signal: AbortSignal): Promise<Response> {
    for (let attempt = 0; attempt < 2; attempt++) {
      signal.throwIfAborted();
      let response: Response;
      try {
        response = await this.fetcher(new URL(path, NEBIUS_ENDPOINT), { method: body === undefined ? "GET" : "POST", headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal, redirect: "error", cache: "no-store" });
      } catch (error) {
        if (attempt === 0 && !signal.aborted && error instanceof TypeError) { await delay(250, undefined, { signal }); continue; }
        throw error;
      }
      if (response.ok) return response;
      void response.body?.cancel().catch(() => {});
      if (attempt === 0 && (response.status === 429 || response.status >= 500)) { await delay(250, undefined, { signal }); continue; }
      if (response.status === 429) throw new AiServiceError("RATE_LIMITED", "AI đang giới hạn yêu cầu. Vui lòng thử lại sau.", true);
      if ([400, 401, 403, 404, 422].includes(response.status)) throw new AiServiceError("AI_MODEL_UNAVAILABLE", "Cấu hình hoặc khả năng của mô hình Nebius chưa khả dụng.");
      throw new AiServiceError("AI_PROVIDER_ERROR", "Dịch vụ AI tạm thời không khả dụng.", true);
    }
    throw new AiServiceError("AI_PROVIDER_ERROR", "Dịch vụ AI tạm thời không khả dụng.", true);
  }
  private async verifyModel(signal: AbortSignal): Promise<void> {
    if (Date.now() - this.modelCheckedAt < 300000) return;
    const response = await this.request("models", undefined, signal);
    const list = z.object({ data: z.array(z.object({ id: z.string() })).max(2000) }).safeParse(parseJson(await boundedText(response, signal)));
    if (!list.success || !list.data.data.some(m => m.id === this.config.model)) throw new AiServiceError("AI_MODEL_UNAVAILABLE", "Mô hình Nemotron không có trong danh sách được phép của tài khoản.");
    this.modelCheckedAt = Date.now();
  }
  private payload(task: keyof typeof TASK_PROMPTS, input: AiContext, data: unknown, schema?: z.ZodType) {
    return { model: this.config.model, store: false, temperature: 0.3, max_completion_tokens: 4096,
      messages: [{ role: "system", content: `${SYSTEM_PROMPT}\n${TASK_PROMPTS[task]}${schema ? "\nReturn ONLY the JSON object matching this schema: " + JSON.stringify(z.toJSONSchema(schema)) : ""}` },
        { role: "user", content: JSON.stringify({ sources: input.sources, concepts: input.concepts, ...data as object }) }],
      ...(schema ? { response_format: { type: "json_schema", json_schema: { name: `actically_${task}_v1`, strict: true, schema: z.toJSONSchema(schema) } } } : {}),
    };
  }
  private async structured<T>(task: keyof typeof TASK_PROMPTS, input: AiContext, data: unknown, schema: z.ZodType<T>): Promise<T> {
    const op = this.begin(input, data);
    try {
      await this.verifyModel(op.signal);
      const response = await this.request("chat/completions", { ...this.payload(task, input, data, schema), stream: false }, op.signal);
      const completion = completionSchema.safeParse(parseJson(await boundedText(response, op.signal)));
      if (!completion.success) invalidOutput();
      const choice = completion.data.choices[0];
      if (choice.finish_reason !== "stop" || choice.message.refusal || !choice.message.content || hiddenTrace.test(choice.message.content)) invalidOutput();
      const result = schema.safeParse(parseJson(choice.message.content));
      if (!result.success) invalidOutput();
      op.signal.throwIfAborted();
      return result.data;
    } catch (error) { throw this.safeError(error, input, op.signal); }
    finally { op.end(); }
  }
  async *streamChat(input: AiChatInput): AsyncGenerator<AiChatEvent> {
    if (input.mode === "solve") throw new AiServiceError("VALIDATION_ERROR", "Dùng phương thức Solve cho kết quả có cấu trúc.");
    if (!input.messages.length || input.messages.length > 24 || input.messages.some(m => !["user", "assistant"].includes(m.role) || !m.content.trim() || m.content.length > 16000)) throw new AiServiceError("VALIDATION_ERROR", "Lịch sử trò chuyện không hợp lệ hoặc quá dài.");
    const data = { messages: input.messages, followUpStep: input.followUpStep, previousSolve: input.previousSolve };
    const op = this.begin(input, data); let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      await this.verifyModel(op.signal);
      const response = await this.request("chat/completions", { ...this.payload(input.mode, input, data), stream: true }, op.signal);
      if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) invalidOutput();
      reader = response.body.getReader(); const decoder = new TextDecoder();
      let buffer = "", content = "", emitted = 0, bytes = 0, ended = false, stopped = false;
      while (!ended) {
        const chunk = await readChunk(reader, op.signal);
        if (chunk.done) break;
        bytes += chunk.value.byteLength; if (bytes > 262144) invalidOutput();
        buffer += decoder.decode(chunk.value, { stream: true });
        let boundary: RegExpExecArray | null;
        while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
          const frame = buffer.slice(0, boundary.index); buffer = buffer.slice(boundary.index + boundary[0].length);
          const dataText = frame.split(/\r?\n/).filter(l => l.startsWith("data:")).map(l => l.slice(5).trimStart()).join("\n");
          if (!dataText) continue;
          if (dataText === "[DONE]") { ended = true; break; }
          const parsed = chunkSchema.safeParse(parseJson(dataText)); if (!parsed.success) invalidOutput();
          const choice = parsed.data.choices[0]; if (!choice) continue;
          if (choice.delta.refusal) invalidOutput();
          if (choice.finish_reason) { if (choice.finish_reason !== "stop") invalidOutput(); stopped = true; }
          content += choice.delta.content ?? "";
          if (content.length > 32000 || hiddenTrace.test(content)) invalidOutput();
          // Hold a short tail so a reasoning tag split across network chunks cannot leak.
          const safeEnd = Math.max(0, content.length - 32);
          if (safeEnd > emitted) { op.signal.throwIfAborted(); yield { event: "delta", text: content.slice(emitted, safeEnd) }; emitted = safeEnd; }
        }
      }
      if (!ended || !stopped || !content.trim()) invalidOutput();
      if (input.mode === "socratic" && (content.match(/[?？]/g)?.length ?? 0) !== 1) invalidOutput();
      op.signal.throwIfAborted();
      if (emitted < content.length) yield { event: "delta", text: content.slice(emitted) };
      op.signal.throwIfAborted();
      yield { event: "done", content, sourceRefs: [] };
    } catch (error) { throw this.safeError(error, input, op.signal); }
    finally { void reader?.cancel().catch(() => {}); op.end(); }
  }
  async solve(input: AiChatInput) {
    if (!input.messages.length || input.messages.length > 24 || input.messages.some(m => !["user", "assistant"].includes(m.role) || !m.content.trim() || m.content.length > 16000)) throw new AiServiceError("VALIDATION_ERROR", "Lịch sử Solve không hợp lệ.");
    const result = await this.structured("solve", input, { messages: input.messages, followUpStep: input.followUpStep, previousSolve: input.previousSolve }, solveResultSchema);
    if (result.steps.some((s, i) => s.number !== i + 1)) invalidOutput();
    verifySourceRefs(result.sourceRefs, input); return result;
  }
  private validatePractice(input: AiPracticeInput) {
    if (input.signal?.aborted) throw new AiServiceError("AI_CANCELLED", "Yêu cầu đã bị hủy.");
    if (!input.learnerText.trim() || input.learnerText.length > 16000) throw new AiServiceError("VALIDATION_ERROR", "Bài viết không hợp lệ hoặc quá dài.");
    validateContext(input, input.learnerText);
  }
  async evaluateFeynman(input: AiPracticeInput) {
    this.validatePractice(input); if (!input.concepts.length) return neutralFeynman();
    return validateEvaluation(await this.structured("feynman", input, { learnerText: input.learnerText }, feynmanResultSchema), input);
  }
  async evaluateBlurting(input: AiPracticeInput) {
    this.validatePractice(input); if (!input.concepts.length) return neutralBlurting();
    return validateEvaluation(await this.structured("blurting", input, { learnerText: input.learnerText }, blurtingResultSchema), input);
  }
  async extractConcepts(input: AiExtractionInput) {
    if (input.signal?.aborted) throw new AiServiceError("AI_CANCELLED", "Yêu cầu đã bị hủy.");
    if (input.messages.length > 24 || input.messages.some(m => !["user", "assistant"].includes(m.role) || m.content.length > 16000)) throw new AiServiceError("VALIDATION_ERROR", "Lịch sử trích xuất không hợp lệ.");
    validateContext(input, input.messages);
    if (!input.sources.length) return { sufficientEvidence: false, concepts: [] };
    const result = await this.structured("extraction", input, { messages: input.messages }, aiExtractionSchema);
    if (!result.sufficientEvidence) return { sufficientEvidence: false, concepts: [] };
    if (!result.concepts.length) invalidOutput();
    for (const concept of result.concepts) verifySourceRefs(concept.sourceRefs, input);
    return result;
  }
  async generateFlashcard(input: AiCardInput) {
    if (input.concept.status !== "approved" || !input.concepts.some(c => c.id === input.concept.id && c.revision === input.concept.revision && c.body === input.concept.body && c.title === input.concept.title && JSON.stringify(c.sourceRefs) === JSON.stringify(input.concept.sourceRefs))) throw new AiServiceError("VALIDATION_ERROR", "Chỉ tạo thẻ từ khái niệm đã duyệt và snapshot đã xác minh.");
    const result = await this.structured("flashcard", input, { concept: input.concept }, aiFlashcardSchema);
    verifySourceRefs(result.sourceRefs, input);
    if (result.sourceRefs.some(r => !input.concept.sourceRefs.some(s => s.sourceId === r.sourceId && s.revision === r.revision))) invalidOutput();
    if (input.concept.sourceRefs.some(s => !result.sourceRefs.some(r => r.sourceId === s.sourceId && r.revision === s.revision))) invalidOutput();
    return result;
  }
}
