import { sourceCreateSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { createSource, listSources } from "@/server/services/knowledge";

export const GET = route<{ id: string }>((ctx, { params }) => listSources(ctx, params.id));
export const POST = route<{ id: string }>(async (ctx, { req, params }) => createSource(ctx, params.id, await readBody(req, sourceCreateSchema)));
