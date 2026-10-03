import { readListQuery, route } from "@/server/auth/route";
import { dueQueue } from "@/server/services/review";

export const GET = route((ctx, { req }) => dueQueue(ctx, readListQuery(req)));
