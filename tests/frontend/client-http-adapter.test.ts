import { afterEach, expect, it, vi } from "vitest";
import HttpAdapter from "@/lib/client/httpAdapter";
import { userProfile, sources, flashcards, topicProgress } from "@/lib/client/fixtures";
import type { ChatEvent } from "@/contracts/sse";
const client = new HttpAdapter("/api/v1");
const input = { requestId: "request-1", mode: "ask" as const, followUpStep: null, content: "hello" };
const frame = (event: string, data: unknown) => `event: ${event}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`;
const meta = frame("meta", { requestId: input.requestId, sessionId: "s1", userMessageId: "u1", assistantMessageId: "a1" });
const message = { id: "a1", sessionId: "s1", role: "assistant", content: "Xin chào", status: "completed", solve: null,
  requestId: input.requestId, requestContext: { mode: "ask", followUpStep: null }, createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" };
const done = frame("done", { requestId: input.requestId, message });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
function response(value: unknown, status = 200) { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(value, { status }))); }
function stream(text: string, byteByByte = false) {
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream<Uint8Array>({ start(c) {
    if (byteByByte) for (const byte of bytes) c.enqueue(Uint8Array.of(byte)); else c.enqueue(bytes);
    c.close();
  } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { headers: { "content-type": "text/event-stream" } })));
}
async function events(signal?: AbortSignal) { const result: ChatEvent[] = []; for await (const event of client.streamChat("s1", input, signal)) result.push(event); return result; }

it.each([[401, "UNAUTHENTICATED"], [404, "NOT_FOUND"], [429, "RATE_LIMITED"]])("preserves typed HTTP error %i", async (status, code) => {
  response({ error: { code, message: "Safe failure", requestId: "r1", retryable: status === 429 } }, status as number);
  await expect(client.getProfile()).rejects.toMatchObject({ name: "ActicallyClientError", code, requestId: "r1" });
});
it("validates DTOs and sends cookie credentials", async () => {
  response({ data: userProfile });
  expect(await client.getProfile()).toEqual(userProfile);
  expect(fetch).toHaveBeenCalledWith("/api/v1/profile", expect.objectContaining({ credentials: "include", method: "GET" }));
});
it.each([{ profile: userProfile }, { data: { id: "incomplete" } }, { data: userProfile, extra: true }])("rejects invalid success envelope %j", async value => {
  response(value); await expect(client.getProfile()).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
});
it("rejects plain text and malformed JSON success", async () => {
  for (const [text, type] of [["OK", "text/plain"], ["{", "application/json"]]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(text, { headers: { "content-type": type } })));
    await expect(client.getProfile()).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  }
});
it("uses the frozen sources/cards/progress namespaces", async () => {
  const spy = vi.fn().mockResolvedValueOnce(Response.json({ data: sources })).mockResolvedValueOnce(Response.json({ data: flashcards }))
    .mockResolvedValueOnce(Response.json({ data: topicProgress })).mockResolvedValueOnce(Response.json({ data: null }));
  vi.stubGlobal("fetch", spy);
  await client.listSources("a/b"); await client.listCards({ limit: 100, offset: 0 }); await client.getProgress(); await client.deleteCard("c");
  expect(spy.mock.calls.map(c => c[0])).toEqual(["/api/v1/study-sets/a%2Fb/sources", "/api/v1/cards?limit=100&offset=0", "/api/v1/progress", "/api/v1/cards/c"]);
  expect(spy.mock.calls[3][1].method).toBe("DELETE");
});
it("decodes UTF8 split at every byte, CRLF and comments", async () => {
  stream(": heartbeat\r\n\r\n" + meta + frame("delta", { requestId: input.requestId, text: "Xin chào" }) + done, true);
  const result = await events();
  expect(result.map(e => e.event)).toEqual(["meta", "delta", "done"]);
  expect(result[1].data).toMatchObject({ text: "Xin chào" });
});
it.each([
  meta, meta + 'event: delta\ndata: {\n\n', frame("delta", { requestId: input.requestId, text: "before meta" }),
  meta + frame("delta", { requestId: "wrong", text: "x" }), meta + frame("done", { requestId: input.requestId, message: { ...message, id: "wrong" } }),
  meta + frame("done", { requestId: input.requestId, message: { ...message, status: "failed" } }),
])("rejects malformed, truncated or uncorrelated streams", async text => {
  stream(text); await expect(events()).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
});
it("maps typed SSE failure without converting partial output to done", async () => {
  stream(meta + frame("delta", { requestId: input.requestId, text: "partial" }) + frame("error", { requestId: input.requestId, code: "AI_TIMEOUT", message: "Timeout", retryable: true }));
  await expect(events()).rejects.toMatchObject({ code: "AI_TIMEOUT", requestId: input.requestId });
});
it("bounds unfinished frames and JSON byte size", async () => {
  stream("event: delta\ndata: " + "x".repeat(1024 * 1024 + 1));
  await expect(events()).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(" ".repeat(8 * 1024 * 1024 + 1), { headers: { "content-type": "application/json" } })));
  await expect(client.getProfile()).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
});
const generationAt = "2026-10-01T00:00:00.001Z";
function stalledStream() {
  let push!: (text: string) => void;
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({ start(c) { push = text => c.enqueue(new TextEncoder().encode(text)); }, cancel });
  return { push, cancel, response: new Response(body, { headers: { "content-type": "text/event-stream", "X-Actically-Generation": generationAt } }) };
}
it("queues abort until persisted meta, acknowledges cancellation, then cancels a blocked reader", async () => {
  const controller = new AbortController(), sse = stalledStream();
  const spy = vi.fn().mockResolvedValueOnce(sse.response).mockResolvedValueOnce(Response.json({ data: { ...message, status: "cancelled" } }));
  vi.stubGlobal("fetch", spy);
  controller.abort();
  const iterator = client.streamChat("s1", input, controller.signal)[Symbol.asyncIterator]();
  const first = iterator.next();
  await Promise.resolve(); await Promise.resolve();
  expect(spy).toHaveBeenCalledTimes(1); // no row to cancel before meta
  expect(spy.mock.calls[0][1].signal.aborted).toBe(false);
  sse.push(meta);
  expect((await first).value?.event).toBe("meta");
  await expect(iterator.next()).rejects.toMatchObject({ name: "AbortError" });
  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy.mock.calls[1][0]).toBe("/api/v1/sessions/s1/messages/cancel");
  expect(JSON.parse(spy.mock.calls[1][1].body)).toEqual({ requestId: input.requestId, generationAt });
  expect(spy.mock.calls[1][1]).toMatchObject({ method: "POST", credentials: "include" });
  expect(spy.mock.calls[1][1].signal).not.toBe(controller.signal);
  expect(sse.cancel).toHaveBeenCalledOnce();
});
it("returns authoritative completed ACK even when the SSE reader is blocked", async () => {
  const controller = new AbortController(), sse = stalledStream();
  const spy = vi.fn().mockResolvedValueOnce(sse.response).mockResolvedValueOnce(Response.json({ data: message }));
  vi.stubGlobal("fetch", spy); sse.push(meta);
  const iterator = client.streamChat("s1", input, controller.signal)[Symbol.asyncIterator]();
  await iterator.next();
  const pending = iterator.next(); controller.abort();
  expect((await pending).value).toEqual({ event: "done", data: { requestId: input.requestId, message } });
  expect((await iterator.next()).done).toBe(true);
  expect(sse.cancel).toHaveBeenCalledOnce();
});
it.each(["network", "unauthorized", "malformed", "wrong generation"])("does not falsely confirm cancellation when ACK fails (%s)", async failure => {
  const controller = new AbortController(), sse = stalledStream();
  const spy = vi.fn().mockResolvedValueOnce(sse.response);
  if (failure === "network") spy.mockRejectedValueOnce(new Error("offline"));
  else if (failure === "unauthorized") spy.mockResolvedValueOnce(Response.json({ error: { code: "UNAUTHENTICATED", message: "Login", requestId: "r", retryable: false } }, { status: 401 }));
  else if (failure === "wrong generation") spy.mockResolvedValueOnce(Response.json({ error: { code: "CONFLICT", message: "Retry running", requestId: "r", retryable: false } }, { status: 409 }));
  else spy.mockResolvedValueOnce(Response.json({ data: { ...message, id: "another", status: "cancelled" } }));
  vi.stubGlobal("fetch", spy); sse.push(meta);
  const iterator = client.streamChat("s1", input, controller.signal)[Symbol.asyncIterator]();
  await iterator.next(); controller.abort();
  await expect(iterator.next()).rejects.toMatchObject({ name: "ActicallyClientError", code: "INTERNAL_ERROR", requestId: input.requestId, message: expect.stringContaining("tải lại phiên") });
  expect(sse.cancel).toHaveBeenCalledOnce();
});
it("bounds cancellation waiting before meta without claiming server acknowledgement", async () => {
  vi.useFakeTimers();
  const controller = new AbortController(), sse = stalledStream();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sse.response));
  const result = events(controller.signal);
  const checked = expect(result).rejects.toMatchObject({ name: "ActicallyClientError", code: "INTERNAL_ERROR" });
  controller.abort(); await vi.advanceTimersByTimeAsync(10_000); await checked;
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(sse.cancel).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
it("keeps transport open until ACK and reports an ACK timeout as unconfirmed", async () => {
  const controller = new AbortController(), ack = new AbortController(), sse = stalledStream();
  const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValueOnce(ack.signal);
  const body = new ReadableStream<Uint8Array>();
  const spy = vi.fn().mockResolvedValueOnce(sse.response).mockResolvedValueOnce(new Response(body, { headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", spy); sse.push(meta);
  const iterator = client.streamChat("s1", input, controller.signal)[Symbol.asyncIterator]();
  await iterator.next(); controller.abort();
  expect(spy.mock.calls[0][1].signal.aborted).toBe(false);
  expect(timeout).toHaveBeenCalledWith(10_000);
  const next = iterator.next(), checked = expect(next).rejects.toMatchObject({ name: "ActicallyClientError", code: "INTERNAL_ERROR" });
  ack.abort(new DOMException("Timeout", "TimeoutError")); await checked;
  expect(spy.mock.calls[0][1].signal.aborted).toBe(true);
  expect(sse.cancel).toHaveBeenCalledOnce(); timeout.mockRestore();
});
it("cancels reader when consumer leaves early and immediately after terminal done", async () => {
  for (const terminal of [false, true]) {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode(meta + (terminal ? done : ""))); }, cancel });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { headers: { "content-type": "text/event-stream" } })));
    if (terminal) await events(); else for await (const event of client.streamChat("s1", input)) { expect(event.event).toBe("meta"); break; }
    expect(cancel).toHaveBeenCalledOnce();
  }
});
