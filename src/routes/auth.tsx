import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock, Mail, MailCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ErrorText, Field, inputClass } from "@/components/app/ui-bits";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — هدهد الفواتير" },
      { name: "description", content: "سجّل الدخول إلى لوحة هدهد الفواتير أو أنشئ حساباً جديداً." },
      { property: "og:title", content: "تسجيل الدخول — هدهد الفواتير" },
      { property: "og:description", content: "سجّل الدخول للوصول إلى لوحة التحكم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function validate(mode: Mode, email: string, password: string): string | null {
  if (!email.includes("@")) return "أدخل بريداً إلكترونياً صحيحاً";
  if (mode !== "forgot" && password.length < 6) return "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
  return null;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate(mode, email, password);
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) {
          setError(
            authError.message.includes("Invalid login")
              ? "البريد أو كلمة المرور غير صحيحة"
              : authError.message.includes("not confirmed")
                ? "يرجى تأكيد بريدك الإلكتروني أولاً من الرسالة المرسلة إليك"
                : "تعذر إتمام العملية. تأكد من البيانات وحاول مرة أخرى.",
          );
          return;
        }
        navigate({ to: "/home", replace: true });
      } else if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (authError) {
          setError(
            authError.message.includes("already")
              ? "هذا البريد مسجل بالفعل، سجّل الدخول"
              : "تعذر إتمام العملية. تأكد من البيانات وحاول مرة أخرى.",
          );
          return;
        }
        if (data.session) {
          navigate({ to: "/home", replace: true });
        } else {
          setNotice("أرسلنا رسالة تأكيد إلى بريدك. افتحها ثم سجّل الدخول.");
        }
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) {
          setError("تعذر إرسال الرابط. حاول مرة أخرى بعد قليل.");
          return;
        }
        setNotice("إذا كان البريد مسجلاً، ستصلك رسالة فيها رابط لتعيين كلمة مرور جديدة.");
      }
    } catch {
      setError("تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.");
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, { h: string; s: string; cta: string }> = {
    signin: { h: "أهلاً بعودتك", s: "سجّل الدخول للوصول إلى لوحة التحكم", cta: "تسجيل الدخول" },
    signup: { h: "أنشئ حسابك", s: "سجّل بحساب جديد للبدء في إرسال الفواتير", cta: "إنشاء الحساب" },
    forgot: { h: "تعيين كلمة مرور", s: "أدخل بريدك وسنرسل لك رابطاً لاختيار كلمة مرور جديدة", cta: "إرسال الرابط" },
  };
  const t = titles[mode];

  return (
    <main className="min-h-screen bg-background">
      <div className="bg-brand-gradient px-6 pb-20 pt-14 text-primary-foreground">
        <div className="mx-auto max-w-md space-y-2">
          <p className="text-sm font-semibold opacity-90">هدهد الفواتير</p>
          <h1 className="text-3xl font-bold">{t.h}</h1>
          <p className="text-[15px] opacity-90">{t.s}</p>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-md px-4 pb-10">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-[20px] border bg-card p-5 shadow-card">
          <Field label="البريد الإلكتروني" Icon={Mail} htmlFor="email">
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="name@example.com"
              className={`${inputClass} ltr-field`}
              disabled={busy}
            />
          </Field>

          {mode !== "forgot" ? (
            <Field label="كلمة المرور" Icon={Lock} htmlFor="password">
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="••••••"
                  className={`${inputClass} ltr-field pl-11`}
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </Field>
          ) : null}

          {error ? <ErrorText>{error}</ErrorText> : null}
          {notice ? (
            <div className="flex items-start gap-2 rounded-xl bg-success-soft p-3 text-sm font-semibold text-success">
              <MailCheck className="mt-0.5 size-4 shrink-0" />
              <span>{notice}</span>
            </div>
          ) : null}

          <Button type="submit" size="xl" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : t.cta}
          </Button>

          <div className="space-y-2 text-center text-sm">
            {mode === "signin" ? (
              <>
                <button type="button" className="font-semibold text-primary" onClick={() => switchMode("forgot")}>
                  نسيت كلمة المرور؟
                </button>
                <p className="text-muted-foreground">
                  ليس لديك حساب؟{" "}
                  <button type="button" className="font-semibold text-primary" onClick={() => switchMode("signup")}>
                    أنشئ حساباً
                  </button>
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <button type="button" className="font-semibold text-primary" onClick={() => switchMode("signin")}>
                  سجّل الدخول
                </button>
              </p>
            )}
          </div>
        </form>

        {mode === "signin" ? (
          <p className="mt-4 px-2 text-center text-xs leading-relaxed text-muted-foreground">
            كنت تستخدم التطبيق سابقاً؟ اضغط «نسيت كلمة المرور؟» لتأكيد بريدك واختيار كلمة مرور جديدة، وستجد بياناتك كما هي.
          </p>
        ) : null}
      </div>
    </main>
  );
}
