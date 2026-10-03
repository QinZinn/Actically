import { route } from "@/server/auth/route";
import { listMessages } from "@/server/services/sessions";

export const GET = route<{ id: string }>((ctx, { params }) => listMessages(ctx, params.id));
