import { studySetCreateSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { createStudySet, listStudySets } from "@/server/services/knowledge";

export const GET = route(ctx => listStudySets(ctx));
export const POST = route(async (ctx, { req }) => createStudySet(ctx, await readBody(req, studySetCreateSchema)));
