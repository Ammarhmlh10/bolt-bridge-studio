import { Link, createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { PageIntro, SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "الأسعار والباقات — هدهد الفواتير" },
      { name: "description", content: "باقات هدهد الفواتير: ابدأ مجاناً ثم اختر الباقة التي تناسب حجم فواتيرك." },
      { property: "og:title", content: "الأسعار والباقات — هدهد الفواتير" },
      { property: "og:description", content: "ابدأ مجاناً وارفع مستوى باقتك عندما تكبر قائمة عملائك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: { label: string; to: "/auth" | "/contact" };
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "البداية",
    price: "مجاناً",
    period: "",
    description: "لتجربة الخدمة مع عدد قليل من العملاء.",
    features: ["حتى 100 رسالة مجهزة شهرياً", "قالبان للرسائل", "ملفات Excel و CSV", "تطبيق الجوال"],
    cta: { label: "ابدأ مجاناً", to: "/auth" },
  },
  {
    name: "الأعمال",
    price: "99",
    period: "ر.س / شهرياً",
    description: "للمنشآت التي ترسل الفواتير بانتظام.",
    features: [
      "حتى 5,000 رسالة مجهزة شهرياً",
      "قوالب غير محدودة",
      "قراءة فواتير PDF تلقائياً",
      "ربط أكثر من بوابة اتصالات",
      "تقارير حالة الإرسال",
    ],
    cta: { label: "اشترك الآن", to: "/auth" },
    featured: true,
  },
  {
    name: "المؤسسات",
    price: "حسب الطلب",
    period: "",
    description: "للأحجام الكبيرة والتكامل مع أنظمتكم.",
    features: ["عدد رسائل مفتوح", "ربط مباشر مع نظام الفوترة", "مدير حساب مخصص", "دعم بأولوية"],
    cta: { label: "تواصل معنا", to: "/contact" },
  },
];

function PricingPage() {
  return (
    <SiteLayout>
      <PageIntro
        eyebrow="الأسعار والباقات"
        title="باقات واضحة تناسب حجم عملك"
        subtitle="ابدأ مجاناً، وانتقل إلى باقة أكبر متى احتجت. لا رسوم خفية ولا عقود طويلة."
      />
      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-20 md:grid-cols-3">
        {PLANS.map((plan) => (
          <article
            key={plan.name}
            className={cn(
              "flex flex-col rounded-[24px] border bg-card p-6 shadow-card",
              plan.featured && "border-primary ring-2 ring-primary/20",
            )}
          >
            {plan.featured ? (
              <span className="mb-3 self-start rounded-full bg-highlight px-3 py-1 text-xs font-bold text-highlight-foreground">
                الأكثر طلباً
              </span>
            ) : null}
            <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">{plan.price}</span>
              {plan.period ? <span className="text-sm text-muted-foreground">{plan.period}</span> : null}
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild size="tall" variant={plan.featured ? "default" : "soft"} className="mt-8 w-full">
              <Link to={plan.cta.to}>{plan.cta.label}</Link>
            </Button>
          </article>
        ))}
      </section>
    </SiteLayout>
  );
}
