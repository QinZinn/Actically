import { readListQuery, route } from "@/server/auth/route";
import { listCards } from "@/server/services/review";

export const GET = route((ctx, { req }) => listCards(ctx, readListQuery(req)));
