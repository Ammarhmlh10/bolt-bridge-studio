import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ErrorText, Field, inputClass } from "@/components/app/ui-bits";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "كلمة مرور جديدة — هدهد الفواتير" },
      { name: "description", content: "اختر كلمة مرور جديدة لحسابك في هدهد الفواتير." },
      { property: "og:title", content: "كلمة مرور جديدة — هدهد الفواتير" },
      { property: "og:description", content: "اختر كلمة مرور جديدة لحسابك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    if (password !== confirm) return setError("كلمتا المرور غير متطابقتين");
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("تعذر حفظ كلمة المرور. اطلب رابطاً جديداً وحاول مرة أخرى.");
      return;
    }
    navigate({ to: "/home", replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-[20px] border bg-card p-5 shadow-card">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-primary">هدهد الفواتير</p>
          <h1 className="text-2xl font-bold">اختر كلمة مرور جديدة</h1>
          <p className="text-sm text-muted-foreground">
            {ready ? "أدخل كلمة المرور الجديدة مرتين." : "افتح هذه الصفحة من الرابط المرسل إلى بريدك."}
          </p>
        </div>
        <Field label="كلمة المرور الجديدة" Icon={Lock} htmlFor="new-password">
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} ltr-field`}
            disabled={!ready || busy}
          />
        </Field>
        <Field label="تأكيد كلمة المرور" Icon={Lock} htmlFor="confirm-password">
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`${inputClass} ltr-field`}
            disabled={!ready || busy}
          />
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button type="submit" size="xl" className="w-full" disabled={!ready || busy}>
          {busy ? <Loader2 className="animate-spin" /> : "حفظ كلمة المرور"}
        </Button>
      </form>
    </main>
  );
}
