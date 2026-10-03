import type { ConceptSnapshot, SourceSnapshot } from "@/contracts/ai";
import type { SourceRef } from "@/contracts/dto";

/** Synthetic transport for cross-layer tests. Exercises the real provider validator, never a live model. */
export function mockNebiusTransport() {
  const calls: { task: string; input: unknown }[] = [];
  const model = "nvidia/test-nemotron";
  const fetcher: typeof fetch = async (url, init) => {
    if (String(url).endsWith("/models")) return Response.json({ data: [{ id: model }] });
    const body = JSON.parse(String(init?.body)) as {
      stream: boolean;
      messages: { content: string }[];
      response_format?: { json_schema: { name: string } };
    };
    const input = JSON.parse(body.messages[1].content) as {
      sources: SourceSnapshot[];
      concepts: ConceptSnapshot[];
      concept?: ConceptSnapshot;
      learnerText?: string;
    };
    const task = body.response_format?.json_schema.name ?? "stream";
    calls.push({ task, input });
    if (body.stream) {
      const text = "Vì sao công thức xác suất có điều kiện cần P(B) > 0?";
      const frames = [
        { choices: [{ delta: { content: text }, finish_reason: null }] },
        { choices: [{ delta: {}, finish_reason: "stop" }] },
      ].map(frame => `data: ${JSON.stringify(frame)}\r\n\r\n`).join("") + "data: [DONE]\r\n\r\n";
      const bytes = new TextEncoder().encode(frames);
      return new Response(new ReadableStream({ start(controller) {
        for (let i = 0; i < bytes.length; i += 11) controller.enqueue(bytes.slice(i, i + 11));
        controller.close();
      } }), { headers: { "Content-Type": "text/event-stream" } });
    }
    const source = input.sources[0];
    const refs: SourceRef[] = source ? [{ sourceId: source.sourceId, revision: source.revision, excerpt: "P(A|B) = P(A ∩ B) / P(B)" }] : [];
    let result: unknown;
    if (task === "actically_extraction_v1") {
      result = { sufficientEvidence: !!source, concepts: source ? [{ title: "Xác suất có điều kiện", body: "Với P(B) > 0, P(A|B) = P(A ∩ B) / P(B).", sourceRefs: refs }] : [] };
    } else if (task === "actically_flashcard_v1") {
      result = { front: "Công thức xác suất có điều kiện và điều kiện mẫu số?", back: input.concept!.body, sourceRefs: input.concept!.sourceRefs };
    } else if (task === "actically_solve_v1") {
      result = { steps: [{ number: 1, action: "Xác định biến cố B", explanation: "Kiểm tra P(B) dương trước khi chia.", principle: "P(B) > 0" }], comprehensionCheck: "Vì sao mẫu số cần dương?", sourceRefs: refs };
    } else {
      const concept = input.concepts[0];
      const evidence = [{ conceptId: concept.id, revision: concept.revision, excerpt: concept.body, sourceRefs: concept.sourceRefs }];
      const finding = { text: "Nêu đúng công thức.", learnerQuote: { text: input.learnerText!, start: 0, end: input.learnerText!.length }, evidence };
      result = task === "actically_feynman_v1"
        ? { kind: "feynman", sufficientEvidence: true, summary: "Giải thích có căn cứ.", observations: [finding], scores: { clarity: 8, completeness: 7, accuracy: 9 } }
        : { kind: "blurting", sufficientEvidence: true, summary: "Cần bổ sung điều kiện mẫu số.", observations: [], correct: [finding], missing: [{ text: "Chưa nêu P(B) > 0.", learnerQuote: null, evidence }], incorrect: [] };
    }
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(result) } }] });
  };
  return { fetcher, model, calls };
}
