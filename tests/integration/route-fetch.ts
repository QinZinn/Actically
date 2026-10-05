import * as profile from "@/app/api/v1/profile/route";
import * as sets from "@/app/api/v1/study-sets/route";
import * as set from "@/app/api/v1/study-sets/[id]/route";
import * as sources from "@/app/api/v1/study-sets/[id]/sources/route";
import * as source from "@/app/api/v1/sources/[id]/route";
import * as sessions from "@/app/api/v1/sessions/route";
import * as session from "@/app/api/v1/sessions/[id]/route";
import * as messages from "@/app/api/v1/sessions/[id]/messages/route";
import * as stream from "@/app/api/v1/sessions/[id]/messages/stream/route";
import * as cancel from "@/app/api/v1/sessions/[id]/messages/cancel/route";
import * as finish from "@/app/api/v1/sessions/[id]/finish/route";
import * as attempts from "@/app/api/v1/practice-attempts/route";
import * as attempt from "@/app/api/v1/practice-attempts/[id]/route";
import * as evaluate from "@/app/api/v1/practice-attempts/[id]/evaluate/route";
import * as retry from "@/app/api/v1/practice-attempts/[id]/retry/route";
import * as concepts from "@/app/api/v1/concepts/route";
import * as concept from "@/app/api/v1/concepts/[id]/route";
import * as cards from "@/app/api/v1/cards/route";
import * as generate from "@/app/api/v1/cards/generate/route";
import * as card from "@/app/api/v1/cards/[id]/route";
import * as grade from "@/app/api/v1/cards/[id]/grade/route";
import * as due from "@/app/api/v1/review/due/route";
import * as progress from "@/app/api/v1/progress/route";
import * as search from "@/app/api/v1/search/route";

type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
type Handlers = Partial<Record<"GET" | "POST" | "PATCH" | "DELETE", Handler>>;
const routes: [RegExp, Handlers][] = [
  [/^profile$/, profile], [/^study-sets$/, sets], [/^study-sets\/([^/]+)$/, set],
  [/^study-sets\/([^/]+)\/sources$/, sources], [/^sources\/([^/]+)$/, source],
  [/^sessions$/, sessions], [/^sessions\/([^/]+)$/, session],
  [/^sessions\/([^/]+)\/messages$/, messages], [/^sessions\/([^/]+)\/messages\/stream$/, stream],
  [/^sessions\/([^/]+)\/messages\/cancel$/, cancel],
  [/^sessions\/([^/]+)\/finish$/, finish], [/^practice-attempts$/, attempts],
  [/^practice-attempts\/([^/]+)$/, attempt], [/^practice-attempts\/([^/]+)\/evaluate$/, evaluate],
  [/^practice-attempts\/([^/]+)\/retry$/, retry], [/^concepts$/, concepts], [/^concepts\/([^/]+)$/, concept],
  [/^cards$/, cards], [/^cards\/generate$/, generate], [/^cards\/([^/]+)$/, card],
  [/^cards\/([^/]+)\/grade$/, grade], [/^review\/due$/, due], [/^progress$/, progress], [/^search$/, search],
];

/** Real route exports in process, with a test-shim authenticated identity. No TCP/browser/Supabase claim. */
export const routeFetch: typeof fetch = async (input, init) => {
  const request = new Request(input instanceof Request ? input : new URL(String(input), "http://actically.test"), init);
  const path = new URL(request.url).pathname.replace(/^\/api\/v1\//, "");
  for (const [pattern, handlers] of routes) {
    const match = pattern.exec(path);
    if (!match) continue;
    const handler = handlers[request.method as keyof Handlers];
    if (!handler) return new Response(null, { status: 405 });
    return handler(request, { params: Promise.resolve({ id: decodeURIComponent(match[1] ?? "") }) });
  }
  return new Response(null, { status: 404 });
};
