import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  LayoutTemplate,
  RadioTower,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  ListChecks,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import heroImage from "@/assets/hero-hoopoe.jpg";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "هدهد الفواتير — من ملف الفواتير إلى رسالة جاهزة لكل عميل" },
      {
        name: "description",
        content:
          "ارفع ملف Excel أو CSV أو فواتير PDF، واختر قالبك، واستلم رسالة جاهزة لكل عميل يرسلها جوالك عبر بوابة الاتصالات التي تختارها.",
      },
      { property: "og:title", content: "هدهد الفواتير — رسائل الفواتير بخطوات بسيطة" },
      {
        property: "og:description",
        content: "حوّل ملفات الفواتير وقوائم العملاء إلى رسائل مخصصة جاهزة للإرسال من جوالك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const FEATURES: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: FileSpreadsheet, title: "Excel و CSV", text: "ارفع قائمة العملاء كما هي، ونتعرف تلقائياً على أعمدة الاسم والجوال والمبلغ ورقم الفاتورة." },
  { Icon: FileText, title: "قراءة فواتير PDF", text: "نستخرج اسم العميل ورقمه والمبلغ وتاريخ الاستحقاق من فواتير PDF بالذكاء الاصطناعي." },
  { Icon: LayoutTemplate, title: "قوالب بمتغيرات", text: "اكتب رسالتك مرة واحدة باستخدام {{الاسم}} و {{المبلغ}} وتُملأ تلقائياً لكل عميل." },
  { Icon: Smartphone, title: "الإرسال من جوالك", text: "تصل الرسائل الجاهزة إلى تطبيق الجوال، ويرسلها مباشرة عبر البوابة التي ربطتها." },
  { Icon: RadioTower, title: "أي بوابة اتصالات", text: "اربط مزود الرسائل الذي تتعامل معه من التطبيق، دون أن تمر بياناته عبر جهات أخرى." },
  { Icon: ShieldCheck, title: "بياناتك خاصة", text: "كل حساب يرى دفعاته ورسائله فقط، والملفات تُعالج ولا تُخزن على الخادم." },
];

const STEPS: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Upload, title: "ارفع الملف", text: "ملف Excel أو CSV أو فاتورة PDF من جوالك أو حاسوبك." },
  { Icon: ListChecks, title: "اختر القالب", text: "يجهّز الخادم رسالة مخصصة لكل عميل ويتحقق من أرقام الجوال." },
  { Icon: Send, title: "أرسل من الجوال", text: "يستلم التطبيق الرسائل ويرسلها، ثم يحدّث حالة كل رسالة." },
];

function LandingPage() {
  return (
    <SiteLayout>
      <section className="bg-hero-glow">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-2 md:pb-24 md:pt-20">
          <div className="space-y-6 text-center md:text-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-border bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="size-3.5" />
              جديد: قراءة فواتير PDF تلقائياً
            </span>
            <h1 className="text-4xl font-bold leading-[1.25] text-foreground md:text-6xl">
              من ملف الفواتير إلى <span className="text-primary">رسالة جاهزة</span> لكل عميل
            </h1>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground md:mx-0">
              ارفع قائمة عملائك أو فواتيرك، واختر قالب الرسالة، ودع هدهد يجهّز الرسائل ويعيدها إلى جوالك لترسلها
              عبر بوابة الاتصالات التي تختارها.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
              <Button asChild size="xl" variant="highlight">
                <Link to="/download">
                  حمّل التطبيق
                  <ArrowLeft />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="bg-card">
                <Link to="/auth">جرّبه من المتصفح</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-6 rounded-[40px] bg-primary/10 blur-2xl" aria-hidden />
            <img
              src={heroImage}
              alt="طائر الهدهد يحمل الفواتير والرسائل إلى الجوال"
              width={1024}
              height={1024}
              className="relative rounded-[32px] border bg-card shadow-card"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24" aria-labelledby="features-title">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold text-primary">المميزات</p>
          <h2 id="features-title" className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
            كل ما تحتاجه لتذكير عملائك بفواتيرهم
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-[20px] border bg-card p-6 shadow-card">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft">
                <f.Icon className="size-6 text-primary" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y bg-card" aria-labelledby="steps-title">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold text-primary">كيف يعمل</p>
            <h2 id="steps-title" className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
              ثلاث خطوات فقط
            </h2>
          </div>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-[20px] border bg-background p-6">
                <span className="absolute -top-4 start-6 flex size-8 items-center justify-center rounded-full bg-highlight text-sm font-bold text-highlight-foreground">
                  {i + 1}
                </span>
                <s.Icon className="mt-2 size-7 text-primary" />
                <h3 className="mt-3 text-lg font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="flex flex-col items-center gap-6 rounded-[28px] bg-brand-gradient px-6 py-12 text-center text-primary-foreground md:px-12">
          <h2 className="text-3xl font-bold md:text-4xl">جاهز لإرسال أول دفعة؟</h2>
          <p className="max-w-xl text-base leading-relaxed text-primary-foreground/85">
            ابدأ مجاناً، وجهّز رسائل فواتيرك خلال دقائق.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl" variant="highlight">
              <Link to="/pricing">اطّلع على الباقات</Link>
            </Button>
            <Button asChild size="xl" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link to="/contact">تحدث معنا</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
