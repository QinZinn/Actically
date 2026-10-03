import { cardUpdateSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { deleteCard, updateCard } from "@/server/services/review";

export const PATCH = route<{ id: string }>(async (ctx, { req, params }) => updateCard(ctx, params.id, await readBody(req, cardUpdateSchema)));
export const DELETE = route<{ id: string }>((ctx, { params }) => deleteCard(ctx, params.id));
