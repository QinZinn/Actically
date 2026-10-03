import { extractionRequestSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { finishSession } from "@/server/services/sessions";

export const POST = route<{ id: string }>(async (ctx, { req, params }) => finishSession(ctx, params.id, await readBody(req, extractionRequestSchema)));
