"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import ActicallyMark from "@/components/layout/ActicallyMark";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { getBrowserAuth } from "@/lib/client/auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [signup, setSignup] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam === "auth") {
      queueMicrotask(() => {
        setFormError("auth");
      });
    }
  }, [errorParam]);

  function handleDemoClick() {
    if (DEMO_MODE) router.push("/");
  }

  function handleSignupClick() {
    setSignup(v => !v); setFormError(null); setNotice(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!SUPABASE_ENABLED) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    setSubmitting(true);
    try {
      const supabase = getBrowserAuth();
      const { data, error } = await (signup ? supabase.auth.signUp({
        email: trimmedEmail, password,
        options: { emailRedirectTo: new URL("/auth/callback", window.location.origin).href },
      }) : supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      }));
      if (error) {
        setFormError(error.message || "auth");
      } else if (data.session) {
        router.replace("/"); router.refresh();
      } else {
        setNotice("Kiểm tra email để xác nhận tài khoản rồi đăng nhập."); setSignup(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(message || "auth");
    } finally {
      setSubmitting(false);
    }
  }

  const showAuthError = formError !== null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[440px]">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center mb-8">
              <ActicallyMark className="size-10 text-primary mb-5" />
              <h1 className="text-2xl font-semibold tracking-tight text-center">
                {signup ? "Tạo tài khoản Actically" : "Chào mừng đến Actically"}
              </h1>
              <p className="text-muted-foreground text-center mt-2">
                Học sâu, nhớ lâu
              </p>
            </div>

            {!SUPABASE_ENABLED && (
              <div className="mb-6">
                <ErrorState
                  variant="compact"
                  title="Kết nối Supabase chưa được cấu hình"
                  body="Dịch vụ đăng nhập chưa được cấu hình."
                  secondaryLabel={DEMO_MODE ? "Vào chế độ xem mẫu" : undefined}
                  onSecondary={DEMO_MODE ? handleDemoClick : undefined}
                />
                <div className="flex justify-center mt-4">
                  <Badge variant={DEMO_MODE ? "solid" : "nodata"} size="sm">
                    {DEMO_MODE ? "CHẾ ĐỘ MẪU ĐANG BẬT" : "CHẾ ĐỘ MẪU: " + (DEMO_MODE ? "bật" : "tắt")}
                  </Badge>
                </div>
              </div>
            )}

            {SUPABASE_ENABLED && showAuthError && (
              <div className="mb-6">
                <ErrorState
                  variant="compact"
                  title="Đăng nhập thất bại"
                  body={
                    formError === "auth"
                      ? "Thông tin đăng nhập không đúng, hãy thử lại hoặc đăng ký."
                      : formError
                  }
                />
              </div>
            )}

            {notice && <p role="status" className="mb-4 text-sm">{notice}</p>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@school.edu.vn"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!SUPABASE_ENABLED || submitting}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete={signup ? "new-password" : "current-password"}
                  minLength={signup ? 6 : 1}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!SUPABASE_ENABLED || submitting}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSignupClick}
                  disabled={!SUPABASE_ENABLED || submitting}
                >
                  {signup ? "Đã có tài khoản" : "Tạo tài khoản mới"}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!SUPABASE_ENABLED || submitting}
                >
                  <ArrowRight className="w-4 h-4" />
                  {submitting ? "Đang xử lý…" : signup ? "Đăng ký" : "Đăng nhập"}
                </Button>
              </div>
            </form>

            {DEMO_MODE && (
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDemoClick}
                >
                  Vào chế độ xem mẫu
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Actically · Học chủ động
        </p>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Đang tải…</div>}>
      <LoginPageInner />
    </Suspense>
  );
}
