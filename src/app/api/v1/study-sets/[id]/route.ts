import { studySetUpdateSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { deleteStudySet, updateStudySet } from "@/server/services/knowledge";

export const PATCH = route<{ id: string }>(async (ctx, { req, params }) => updateStudySet(ctx, params.id, await readBody(req, studySetUpdateSchema)));
export const DELETE = route<{ id: string }>((ctx, { params }) => deleteStudySet(ctx, params.id));
