import { describe, it, expect } from "vitest";
import { NebiusLearningService } from "@/server/ai/nebius";
import { educationalFixtures, practiceInput, source } from "./educational-fixtures";
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
  it("returns valid Blurting evidence for an incorrect recalled formula", async () => {
    const result = await service!.evaluateBlurting(practiceInput(2));
    expect(result.sufficientEvidence).toBe(true);
    expect(result.incorrect.some(f => f.learnerQuote?.text.includes("P(A)P(B)"))).toBe(true);
  }, 65000);
  it("completes source-grounded Socratic output within the token budget", async () => {
    const input = { ...practiceInput(), sources: [{ ...source, content: source.content + " Một lớp có 30 học sinh, 8 bạn học Tin và 4 bạn học cả Tin lẫn Toán. Nếu biết bạn được chọn học Tin, xác suất học Toán là 4/8, không phải 4/30." }], mode: "socratic" as const,
      messages: [{ role: "user" as const, content: "Mình nghĩ xác suất một bạn học Tin cũng học Toán là 4/30 vì lớp có 30 người. Hãy giúp mình tự nhận ra điểm sai bằng một câu hỏi gợi mở." }], followUpStep: null, previousSolve: null };
    let answer = "", completed = false;
    for await (const event of service!.streamChat(input)) { if (event.event === "delta") answer += event.text; else completed = true; }
    expect(completed).toBe(true);
    expect(answer.match(/[?？]/g)).toHaveLength(1);
    expect(answer).not.toMatch(/[\u3400-\u9fff\uf900-\ufaff]/);
    let followUp = "";
    for await (const event of service!.streamChat({ ...input, messages: [...input.messages, { role: "assistant", content: answer }, { role: "user", content: "Vậy mình chỉ xét 8 bạn học Tin, trong đó có 4 bạn cũng học Toán. Mình nghĩ xác suất đúng là 4/8 = 1/2." }] })) {
      if (event.event === "done") followUp = event.content;
    }
    expect(followUp.match(/[?？]/g)).toHaveLength(1);
    expect(followUp).not.toMatch(/[\u3400-\u9fff\uf900-\ufaff]/);
  }, 130000);
});
