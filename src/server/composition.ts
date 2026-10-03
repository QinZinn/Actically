import "server-only";
import type { AiLearningService } from "@/contracts/ai";
import { unconfiguredAi } from "./ai/unconfigured";
export function getAiLearningService(): AiLearningService { return unconfiguredAi; }
