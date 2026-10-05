import { chatCancelSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { cancelChat } from "@/server/services/sessions";

export const POST = route<{ id: string }>(async (ctx, { req, params }) => cancelChat(ctx, params.id, await readBody(req, chatCancelSchema)));
