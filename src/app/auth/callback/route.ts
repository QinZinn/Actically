import { NextResponse } from "next/server";
import { safeNext } from "@/server/auth/redirect";
import { createSupabaseServerClient } from "@/server/auth/session";

/** Supabase email-confirmation / OAuth code exchange. Redirects only to same-origin relative paths. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")), url.origin));
    } catch { /* auth not configured: fall through to the error redirect */ }
  }
  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
