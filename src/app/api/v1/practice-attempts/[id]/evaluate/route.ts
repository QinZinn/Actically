import { readEmptyBody, route } from "@/server/auth/route";
import { evaluateAttempt } from "@/server/services/practice";

export const POST = route<{ id: string }>(async (ctx, { req, params }) => {
  await readEmptyBody(req);
  return evaluateAttempt(ctx, params.id);
});
