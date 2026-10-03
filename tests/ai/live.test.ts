import { describe, it, expect } from "vitest";
import { NebiusLearningService } from "@/server/ai/nebius";
import { educationalFixtures, practiceInput } from "./educational-fixtures";
const enabled = process.env.ACTICALLY_LIVE_AI === "true" && !!process.env.NEBIUS_API_KEY && !!process.env.NEBIUS_MODEL;
// Explicit opt-in: these tests make bounded paid API calls using ONLY synthetic fixtures.
describe.skipIf(!enabled)("LIVE Nebius account + Nemotron capabilities / synthetic educational evaluation", () => {
  const service = enabled ? new NebiusLearningService({ apiKey: process.env.NEBIUS_API_KEY!, model: process.env.NEBIUS_MODEL!, baseUrl: process.env.NEBIUS_BASE_URL }) : null;
  it("supports structured Solve and Socratic streaming", async () => {
    const input = { ...practiceInput(), mode: "solve" as const, messages: [{ role: "user" as const, content: "Giải thích công thức xác suất có điều kiện." }], followUpStep: null, previousSolve: null };
    expect((await service!.solve(input)).steps.length).toBeGreaterThan(0);
    let answer = "", completed = false;
    for await (const event of service!.streamChat({ ...input, mode: "socratic" })) { if (event.event === "delta") answer += event.text; else completed = true; }
    expect(completed).toBe(true); expect(answer.match(/[?？]/g)).toHaveLength(1);
  }, 130000);
  it("distinguishes correct / partial / incorrect explanations against reference evidence", async () => {
    const results = [];
    for (let i = 0; i < educationalFixtures.length; i++) results.push(await service!.evaluateFeynman(practiceInput(i)));
    expect(results.every(r => r.sufficientEvidence)).toBe(true);
    expect(results[0].scores.accuracy!).toBeGreaterThan(results[2].scores.accuracy!);
    expect(results[0].scores.completeness!).toBeGreaterThanOrEqual(results[1].scores.completeness!);
    expect(results[2].observations.some(o => o.learnerQuote !== null)).toBe(true);
  }, 190000);
});
