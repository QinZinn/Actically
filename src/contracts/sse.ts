import { z } from "zod";
import { apiErrorSchema, idSchema, messageSchema } from "./dto";
export const chatEventSchema = z.discriminatedUnion("event", [
  z.strictObject({ event: z.literal("meta"), data: z.strictObject({ requestId: idSchema, sessionId: idSchema, userMessageId: idSchema, assistantMessageId: idSchema }) }),
  z.strictObject({ event: z.literal("delta"), data: z.strictObject({ requestId: idSchema, text: z.string().max(32000) }) }),
  z.strictObject({ event: z.literal("done"), data: z.strictObject({ requestId: idSchema, message: messageSchema }) }),
  z.strictObject({ event: z.literal("error"), data: apiErrorSchema.shape.error }),
]);
export type ChatEvent = z.infer<typeof chatEventSchema>;
export function encodeChatEvent(event: ChatEvent): string {
  const valid = chatEventSchema.parse(event);
  return `event: ${valid.event}\ndata: ${JSON.stringify(valid.data)}\n\n`;
}
