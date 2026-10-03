import { sessionCreateSchema } from "@/contracts/requests";
import { readBody, readListQuery, route } from "@/server/auth/route";
import { createSession, listSessions } from "@/server/services/sessions";

export const GET = route((ctx, { req }) => listSessions(ctx, readListQuery(req)));
export const POST = route(async (ctx, { req }) => createSession(ctx, await readBody(req, sessionCreateSchema)));
