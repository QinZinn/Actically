import { conceptCreateSchema } from "@/contracts/requests";
import { readBody, readListQuery, route } from "@/server/auth/route";
import { createConcept, listConcepts } from "@/server/services/knowledge";

export const GET = route((ctx, { req }) => listConcepts(ctx, readListQuery(req)));
export const POST = route(async (ctx, { req }) => createConcept(ctx, await readBody(req, conceptCreateSchema)));
