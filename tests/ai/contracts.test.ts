import { describe, it, expect } from "vitest";
import { chatRequestSchema, gradeRequestSchema, profileUpdateSchema } from "@/contracts";
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
});
