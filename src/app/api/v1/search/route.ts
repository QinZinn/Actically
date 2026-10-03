import { readSearchQuery, route } from "@/server/auth/route";
import { search } from "@/server/services/progress";

export const GET = route((ctx, { req }) => search(ctx, readSearchQuery(req)));
