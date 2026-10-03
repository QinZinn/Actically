import { sessionUpdateSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { deleteSession, getSession, updateSession } from "@/server/services/sessions";

export const GET = route<{ id: string }>((ctx, { params }) => getSession(ctx, params.id));
export const PATCH = route<{ id: string }>(async (ctx, { req, params }) => updateSession(ctx, params.id, await readBody(req, sessionUpdateSchema)));
export const DELETE = route<{ id: string }>((ctx, { params }) => deleteSession(ctx, params.id));
