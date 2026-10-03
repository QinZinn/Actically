import type { AiLearningService, AiChatEvent } from "@/contracts/ai";
import { AiServiceError } from "./errors";
const unavailable = (): never => { throw new AiServiceError("AI_NOT_CONFIGURED", "AI chưa được cấu hình."); };
export const unconfiguredAi: AiLearningService = {
  async *streamChat(): AsyncGenerator<AiChatEvent> { unavailable(); },
  solve: async () => unavailable(), evaluateFeynman: async () => unavailable(), evaluateBlurting: async () => unavailable(),
  extractConcepts: async () => unavailable(), generateFlashcard: async () => unavailable(),
};
