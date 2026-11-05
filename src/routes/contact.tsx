import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Mail, MessageSquare, User } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ErrorText, Field, inputClass } from "@/components/app/ui-bits";
import { PageIntro, SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا — هدهد الفواتير" },
      { name: "description", content: "أرسل سؤالك أو طلبك لفريق هدهد الفواتير وسنعود إليك في أقرب وقت." },
      { property: "og:title", content: "تواصل معنا — هدهد الفواتير" },
      { property: "og:description", content: "لديك سؤال عن الباقات أو الربط مع نظامك؟ راسلنا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("اكتب اسمك.");
    if (contact.trim().length < 5) return setError("اكتب بريدك الإلكتروني أو رقم جوالك.");
    if (message.trim().length < 10) return setError("اكتب رسالتك (10 أحرف على الأقل).");
    setBusy(true);
    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert({ name: name.trim(), contact: contact.trim(), message: message.trim() });
    setBusy(false);
    if (dbError) return setError("تعذر إرسال رسالتك الآن. حاول مرة أخرى.");
    setSent(true);
  }

  return (
    <SiteLayout>
      <PageIntro
        eyebrow="تواصل معنا"
        title="يسعدنا أن نسمع منك"
        subtitle="اسألنا عن الباقات، أو اطلب ربط هدهد بنظام الفوترة لديك، وسنعود إليك خلال يوم عمل."
      />
      <section className="mx-auto max-w-xl px-4 pb-20">
        <div className="rounded-[24px] border bg-card p-6 shadow-card">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
              <CheckCircle2 className="size-12 text-success" />
              <h2 className="text-xl font-bold text-foreground">وصلتنا رسالتك</h2>
              <p className="text-sm text-muted-foreground">شكراً لتواصلك، سنرد عليك قريباً.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <Field label="الاسم" Icon={User} htmlFor="contact-name">
                <input id="contact-name" className={inputClass} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="البريد الإلكتروني أو الجوال" Icon={Mail} htmlFor="contact-info">
                <input id="contact-info" className={inputClass} value={contact} maxLength={150} onChange={(e) => setContact(e.target.value)} />
              </Field>
              <Field label="رسالتك" Icon={MessageSquare} htmlFor="contact-message" hint={`${message.length}/2000`}>
                <textarea
                  id="contact-message"
                  rows={5}
                  className={inputClass}
                  value={message}
                  maxLength={2000}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </Field>
              {error ? <ErrorText>{error}</ErrorText> : null}
              <Button type="submit" size="xl" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : "إرسال"}
              </Button>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
