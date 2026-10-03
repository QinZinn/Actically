import { conceptUpdateSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { deleteConcept, updateConcept } from "@/server/services/knowledge";

export const PATCH = route<{ id: string }>(async (ctx, { req, params }) => updateConcept(ctx, params.id, await readBody(req, conceptUpdateSchema)));
export const DELETE = route<{ id: string }>((ctx, { params }) => deleteConcept(ctx, params.id));
