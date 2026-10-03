import { practiceCreateSchema } from "@/contracts/requests";
import { readBody, readListQuery, route } from "@/server/auth/route";
import { createAttempt, listAttempts } from "@/server/services/practice";

export const GET = route((ctx, { req }) => listAttempts(ctx, readListQuery(req)));
export const POST = route(async (ctx, { req }) => createAttempt(ctx, await readBody(req, practiceCreateSchema)));
