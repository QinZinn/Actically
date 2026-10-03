import { cardGenerateSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { generateCard } from "@/server/services/review";

export const POST = route(async (ctx, { req }) => generateCard(ctx, await readBody(req, cardGenerateSchema)));
