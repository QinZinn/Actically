import { sourceUpdateSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { deleteSource, updateSource } from "@/server/services/knowledge";

export const PATCH = route<{ id: string }>(async (ctx, { req, params }) => updateSource(ctx, params.id, await readBody(req, sourceUpdateSchema)));
export const DELETE = route<{ id: string }>((ctx, { params }) => deleteSource(ctx, params.id));
