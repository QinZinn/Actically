import { createBrowserClient } from "@supabase/ssr";
import { ActicallyClientError } from "./errors";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;
export function getBrowserAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ActicallyClientError({ code: "SERVICE_UNAVAILABLE", message: "Đăng nhập chưa được cấu hình.", requestId: "unknown", retryable: false });
  // Use the same cookie storage as the server/proxy; localStorage sessions cannot authenticate API handlers.
  return browserClient ??= createBrowserClient(url, key);
}
export async function signOut() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return;
  const { error } = await getBrowserAuth().auth.signOut();
  if (error) throw error;
}
