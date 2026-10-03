import { describe, it, expect } from "vitest";
import { chatRequestSchema, gradeRequestSchema, profileUpdateSchema, messageSchema } from "@/contracts";
import { unconfiguredAi } from "@/server/ai/unconfigured";
describe("shared trust boundaries", () => {
  it("rejects client identity and invalid revisions/timezones", () => {
    expect(chatRequestSchema.safeParse({ content: "test", mode: "ask", requestId: "r", followUpStep: null, userId: "forged" }).success).toBe(false);
    expect(gradeRequestSchema.safeParse({ presentationId: "p", idempotencyKey: "k", expectedRevision: 0, rating: "good" }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ timezone: "fake/timezone" }).success).toBe(false);
  });
  it("never fakes AI success when unconfigured", async () => {
    await expect(unconfiguredAi.solve({ requestId: "r", sources: [], concepts: [], mode: "solve", messages: [], followUpStep: null, previousSolve: null })).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED", retryable: false });
  });
  it("keeps legacy messages compatible while validating reloadable retry context", () => {
    const message = { id: "a", sessionId: "s", role: "assistant", content: "", status: "failed", solve: null, requestId: "r", createdAt: "2026-10-03T00:00:00Z", updatedAt: "2026-10-03T00:00:00Z" };
    expect(messageSchema.safeParse(message).success).toBe(true);
    expect(messageSchema.safeParse({ ...message, requestContext: { mode: "solve", followUpStep: 1 } }).success).toBe(true);
    expect(messageSchema.safeParse({ ...message, requestContext: { mode: "solve", followUpStep: 99 } }).success).toBe(false);
  });
});
