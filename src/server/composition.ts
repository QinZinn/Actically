import "server-only";
import type { AiLearningService } from "@/contracts/ai";
import { unconfiguredAi } from "./ai/unconfigured";
import { NebiusLearningService } from "./ai/nebius";
import { PROMPT_VERSION } from "./ai/prompts";
let service: AiLearningService | undefined;
export function getAiLearningService(): AiLearningService {
  const apiKey = process.env.NEBIUS_API_KEY;
  const model = process.env.NEBIUS_MODEL;
  if (!apiKey || !model) return unconfiguredAi;
  service ??= new NebiusLearningService({ apiKey, model, baseUrl: process.env.NEBIUS_BASE_URL });
  return service;
}
export function getAiMetadata(): { configured: boolean; model: string; promptVersion: string } {
  return { configured: !!process.env.NEBIUS_API_KEY && !!process.env.NEBIUS_MODEL, model: process.env.NEBIUS_MODEL ?? "unconfigured", promptVersion: PROMPT_VERSION };
}
