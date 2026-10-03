import { chatRequestSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { streamChat } from "@/server/services/sessions";

export const dynamic = "force-dynamic";
export const POST = route<{ id: string }>(async (ctx, { req, params }) => streamChat(ctx, params.id, await readBody(req, chatRequestSchema)));
