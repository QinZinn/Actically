import { route } from "@/server/auth/route";
import { getProgress } from "@/server/services/progress";

export const GET = route(ctx => getProgress(ctx));
