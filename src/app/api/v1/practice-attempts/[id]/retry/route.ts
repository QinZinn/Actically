import { practiceRetrySchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { retryAttempt } from "@/server/services/practice";

export const POST = route<{ id: string }>(async (ctx, { req, params }) => retryAttempt(ctx, params.id, await readBody(req, practiceRetrySchema)));
