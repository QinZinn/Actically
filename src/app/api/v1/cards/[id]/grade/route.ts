import { gradeRequestSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { gradeCard } from "@/server/services/review";

export const POST = route<{ id: string }>(async (ctx, { req, params }) => gradeCard(ctx, params.id, await readBody(req, gradeRequestSchema)));
