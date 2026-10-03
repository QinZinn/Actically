import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import HttpAdapter from "@/lib/client/httpAdapter";
import { ActicallyClientError } from "@/lib/client/errors";

describe("HttpAdapter error mapping and SSE parse", () => {
  let client: HttpAdapter;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new HttpAdapter("/api/v1");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("maps 401 with error body JSON to UNAUTHENTICATED code + requestId", async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      headers: {
        get: (h: string) => (h.toLowerCase() === "content-type" ? "application/json" : null),
      } as Headers,
      json: async () => ({
        error: {
          code: "UNAUTHENTICATED",
          message: "x",
          requestId: "r1",
          retryable: false,
        },
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(client.getProfile()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      requestId: "r1",
      name: "ActicallyClientError",
    });
  });

  it("maps 404 status to NOT_FOUND code + requestId", async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: {
        get: (h: string) => (h.toLowerCase() === "content-type" ? "application/json" : null),
      } as Headers,
      json: async () => ({
        error: {
          code: "NOT_FOUND",
          message: "resource not found",
          requestId: "r2",
          retryable: false,
        },
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(client.getProfile()).rejects.toMatchObject({
      code: "NOT_FOUND",
      requestId: "r2",
      name: "ActicallyClientError",
    });
  });

  it("SSE parse split buffer across chunks yields meta->delta->done", async () => {
    const chunk1 = 'event: meta\ndata: {"requestId":"q1","sessionId":"s1","userMessageId":"u1","assistantMessageId":"a1"}\n\n';
    const chunk2 = 'event: delta\ndata: {"requestId":"q1","text":"Xin ';
    const chunk3 = 'chào bạn"}\n\nevent: done\ndata: {"requestId":"q1","message":{"id":"a1","sessionId":"s1","role":"assistant","content":"Xin chào bạn","status":"completed","solve":null,"requestId":"q1","createdAt":"2026-10-01T00:00:00Z","updatedAt":"2026-10-01T00:00:00Z"}}\n\n';

    let chunkIdx = 0;
    const chunks = [
      new TextEncoder().encode(chunk1),
      new TextEncoder().encode(chunk2),
      new TextEncoder().encode(chunk3),
    ];

    const mockStream = new ReadableStream({
      async pull(controller) {
        if (chunkIdx < chunks.length) {
          controller.enqueue(chunks[chunkIdx]);
          chunkIdx++;
        } else {
          controller.close();
        }
      },
    });

    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {
        get: (h: string) => (h.toLowerCase() === "content-type" ? "text/event-stream" : null),
      } as Headers,
      body: mockStream,
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const events: unknown[] = [];
    for await (const ev of client.streamChat("s1", {
      requestId: "q1",
      content: "hello",
      mode: "ask",
      followUpStep: null,
    })) {
      events.push(ev);
    }

    expect(events.length).toBeGreaterThanOrEqual(3);
    expect((events[0] as { event: string }).event).toBe("meta");
    const metaData = (events[0] as { data: { requestId: string; sessionId: string } }).data;
    expect(metaData.requestId).toBe("q1");
    expect(metaData.sessionId).toBe("s1");

    expect((events[1] as { event: string }).event).toBe("delta");
    const deltaData = (events[1] as { data: { text: string } }).data;
    expect(deltaData.text).toBe("Xin chào bạn");

    expect((events[2] as { event: string }).event).toBe("done");
  });
});
