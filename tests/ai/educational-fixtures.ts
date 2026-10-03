import type { AiPracticeInput, ConceptSnapshot, SourceSnapshot } from "@/contracts/ai";
export const source: SourceSnapshot = { sourceId: "source-probability", revision: 1, title: "Xác suất có điều kiện", content: "Với P(B) > 0, xác suất có điều kiện P(A|B) = P(A ∩ B) / P(B). Độc lập nghĩa là P(A ∩ B) = P(A)P(B)." };
export const concept: ConceptSnapshot = { id: "concept-conditional", studySetId: "set-probability", title: "Xác suất có điều kiện", body: "Với P(B) > 0, xác suất có điều kiện P(A|B) = P(A ∩ B) / P(B).", status: "approved", sourceRefs: [{ sourceId: source.sourceId, revision: 1, excerpt: "P(A|B) = P(A ∩ B) / P(B)" }], revision: 1, createdAt: "2026-10-03T00:00:00Z", updatedAt: "2026-10-03T00:00:00Z" };
// Offline fixtures exercise validation, not real-model educational accuracy.
export const educationalFixtures = [
  { label: "correct", learnerText: "Khi P(B) > 0, P(A|B) = P(A ∩ B) / P(B).", expected: "Recognize correct formula and condition." },
  { label: "partial", learnerText: "P(A|B) = P(A ∩ B) / P(B).", expected: "Missing the positive denominator condition is an omission, not a false formula." },
  { label: "incorrect", learnerText: "P(A|B) = P(A)P(B).", expected: "Quote the false conditional formula and explain the distinction from independence." },
];
export function practiceInput(index = 0): AiPracticeInput { return { requestId: "request-test", sources: [source], concepts: [concept], learnerText: educationalFixtures[index].learnerText }; }
export function finding(text: string, quote: string | null) {
  return { text, learnerQuote: quote === null ? null : { text: quote, start: null, end: null }, evidence: [{ conceptId: concept.id, revision: 1, excerpt: concept.body, sourceRefs: concept.sourceRefs }] };
}
