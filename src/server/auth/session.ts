import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ApiFailure } from "@/server/services/errors";

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ApiFailure("SERVICE_UNAVAILABLE", "Đăng nhập chưa được cấu hình.", false);
  const store = await cookies();
  return createServerClient(url, key, { cookies: {
    getAll: () => store.getAll(),
    setAll: values => { try { for (const { name, value, options } of values) store.set(name, value, options); } catch { /* read-only context; proxy refreshes */ } },
  } });
}

/** Verified identity from Supabase Auth (getUser re-validates the JWT with the auth server). Never from the request body. */
export async function requireUser(): Promise<{ id: string; email: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiFailure("UNAUTHENTICATED", "Vui lòng đăng nhập.", false);
  return { id: data.user.id, email: data.user.email ?? null };
}
