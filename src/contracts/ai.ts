import { z } from "zod";
import { conceptSchema, sourceRefSchema } from "./dto";
import type { SourceRef, SolveResult, FeynmanResult, BlurtingResult, StudyMode } from "./dto";
export const sourceSnapshotSchema = z.strictObject({ sourceId: z.string().min(1), revision: z.number().int().positive(), title: z.string(), content: z.string().min(1).max(50000) });
export const conceptSnapshotSchema = conceptSchema.extend({ status: z.literal("approved") });
export const extractedConceptSchema = z.strictObject({ title: z.string().min(1).max(200), body: z.string().min(1).max(8000), sourceRefs: z.array(sourceRefSchema).min(1).max(20) });
export const aiExtractionSchema = z.strictObject({ sufficientEvidence: z.boolean(), concepts: z.array(extractedConceptSchema).max(15) });
export const aiFlashcardSchema = z.strictObject({ front: z.string().min(1).max(4000), back: z.string().min(1).max(8000), sourceRefs: z.array(sourceRefSchema).max(20) });
export type SourceSnapshot = z.infer<typeof sourceSnapshotSchema>;
export type ConceptSnapshot = z.infer<typeof conceptSnapshotSchema>;
export type AiExtraction = z.infer<typeof aiExtractionSchema>;
export type AiFlashcard = z.infer<typeof aiFlashcardSchema>;
export type AiContext = { requestId: string; signal?: AbortSignal; sources: SourceSnapshot[]; concepts: ConceptSnapshot[] };
export type AiChatInput = AiContext & { mode: StudyMode; messages: { role: "user" | "assistant"; content: string }[]; followUpStep: number | null; previousSolve: SolveResult | null };
export type AiPracticeInput = AiContext & { learnerText: string };
export type AiExtractionInput = AiContext & { messages: { role: "user" | "assistant"; content: string }[] };
export type AiCardInput = AiContext & { concept: ConceptSnapshot };
export type AiChatEvent = { event: "delta"; text: string } | { event: "done"; content: string; sourceRefs: SourceRef[] };
export interface AiLearningService {
  streamChat(input: AiChatInput): AsyncIterable<AiChatEvent>;
  solve(input: AiChatInput): Promise<SolveResult>;
  evaluateFeynman(input: AiPracticeInput): Promise<FeynmanResult>;
  evaluateBlurting(input: AiPracticeInput): Promise<BlurtingResult>;
  extractConcepts(input: AiExtractionInput): Promise<AiExtraction>;
  generateFlashcard(input: AiCardInput): Promise<AiFlashcard>;
}
