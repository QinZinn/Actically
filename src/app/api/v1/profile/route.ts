import { profileUpdateSchema } from "@/contracts/requests";
import { readBody, route } from "@/server/auth/route";
import { getProfile, updateProfile } from "@/server/services/profile";

export const GET = route(ctx => getProfile(ctx));
export const PATCH = route(async (ctx, { req }) => updateProfile(ctx, await readBody(req, profileUpdateSchema)));
