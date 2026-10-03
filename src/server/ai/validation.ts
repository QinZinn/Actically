import { z } from "zod";
import { conceptSnapshotSchema, sourceSnapshotSchema, type AiContext, type AiPracticeInput } from "@/contracts/ai";
import type { SourceRef, Finding, FeynmanResult, BlurtingResult } from "@/contracts/dto";
import { AiServiceError } from "./errors";

export function invalidOutput(): never { throw new AiServiceError("AI_INVALID_OUTPUT", "AI trả về dữ liệu chưa hợp lệ. Vui lòng thử lại.", true); }
export function validateContext(input: AiContext, extra: unknown = null): void {
  if (!input.requestId || input.requestId.length > 128 || input.sources.length > 20 || input.concepts.length > 30) throw new AiServiceError("VALIDATION_ERROR", "Ngữ cảnh vượt giới hạn.");
  const sources = z.array(sourceSnapshotSchema).safeParse(input.sources);
  const concepts = z.array(conceptSnapshotSchema).safeParse(input.concepts);
  if (!sources.success || !concepts.success || JSON.stringify({ sources: input.sources, concepts: input.concepts, extra }).length > 48000) throw new AiServiceError("VALIDATION_ERROR", "Ngữ cảnh không hợp lệ hoặc quá dài.");
  const unique = (keys: string[]) => new Set(keys).size === keys.length;
  if (!unique(input.sources.map(s => `${s.sourceId}:${s.revision}`)) || !unique(input.concepts.map(c => `${c.id}:${c.revision}`))) throw new AiServiceError("VALIDATION_ERROR", "Snapshot trùng lặp.");
  for (const c of input.concepts) verifySourceRefs(c.sourceRefs, input);
}
export function verifySourceRefs(refs: SourceRef[], context: AiContext): void {
  for (const ref of refs) {
    const source = context.sources.find(s => s.sourceId === ref.sourceId && s.revision === ref.revision);
    if (!source || !ref.excerpt.trim() || !source.content.includes(ref.excerpt)) invalidOutput();
  }
}
function verifyFindings(findings: Finding[], input: AiPracticeInput): void {
  for (const finding of findings) {
    if (finding.learnerQuote) {
      const { text, start, end } = finding.learnerQuote;
      if (!text.trim() || !input.learnerText.includes(text)) invalidOutput();
      if ((start === null) !== (end === null)) invalidOutput();
      if (start !== null && end !== null && (end <= start || input.learnerText.slice(start, end) !== text)) invalidOutput();
    }
    for (const evidence of finding.evidence) {
      const concept = input.concepts.find(c => c.id === evidence.conceptId && c.revision === evidence.revision);
      if (!concept || !evidence.excerpt.trim() || !concept.body.includes(evidence.excerpt)) invalidOutput();
      verifySourceRefs(evidence.sourceRefs, input);
      if (evidence.sourceRefs.some(ref => !concept.sourceRefs.some(r => r.sourceId === ref.sourceId && r.revision === ref.revision))) invalidOutput();
    }
  }
}
export function neutralFeynman(): FeynmanResult {
  return { kind: "feynman", sufficientEvidence: false, summary: "Chưa đủ dữ liệu tham chiếu để đánh giá. Hãy bổ sung khái niệm đã duyệt.", observations: [], scores: { clarity: null, completeness: null, accuracy: null } };
}
export function neutralBlurting(): BlurtingResult {
  return { kind: "blurting", sufficientEvidence: false, summary: "Chưa đủ dữ liệu tham chiếu để đánh giá mức độ nhớ. Hãy bổ sung khái niệm đã duyệt.", observations: [], correct: [], missing: [], incorrect: [] };
}
export function validateEvaluation<T extends FeynmanResult | BlurtingResult>(result: T, input: AiPracticeInput): T {
  if (!result.sufficientEvidence) return (result.kind === "feynman" ? neutralFeynman() : neutralBlurting()) as T;
  if (!input.concepts.length) invalidOutput();
  verifyFindings(result.observations, input);
  if (result.kind === "feynman") {
    if (!result.observations.length || Object.values(result.scores).some(v => v === null)) invalidOutput();
  } else {
    if (!result.correct.length && !result.missing.length && !result.incorrect.length) invalidOutput();
    if (result.missing.some(f => f.learnerQuote !== null) || [...result.correct, ...result.incorrect].some(f => f.learnerQuote === null)) invalidOutput();
    verifyFindings([...result.correct, ...result.missing, ...result.incorrect], input);
  }
  return result;
}
