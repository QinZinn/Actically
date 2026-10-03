import { route } from "@/server/auth/route";
import { getAttempt } from "@/server/services/practice";

export const GET = route<{ id: string }>((ctx, { params }) => getAttempt(ctx, params.id));
