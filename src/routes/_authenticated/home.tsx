import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ClipboardList, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "القائمة الرئيسية — هدهد الفواتير" },
      { name: "description", content: "ابدأ من هنا: الرسائل الجاهزة وتجهيز حملات الفواتير." },
      { property: "og:title", content: "القائمة الرئيسية — هدهد الفواتير" },
      { property: "og:description", content: "أرسل رسائل الفواتير لمشتركيك بخطوات بسيطة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function MenuCard({ to, title, description, Icon }: { to: "/templates" | "/campaigns"; title: string; description: string; Icon: LucideIcon }) {
  return (
    <Link
      to={to}
      aria-label={title}
      className="flex items-center gap-4 rounded-[20px] border bg-card p-4 shadow-card transition hover:border-primary-border active:scale-[0.99]"
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
        <Icon className="size-[26px] text-primary" strokeWidth={2} />
      </span>
      <span className="flex-1 space-y-1">
        <span className="block text-[17px] font-bold text-foreground">{title}</span>
        <span className="block text-sm leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <ChevronLeft className="size-[22px] text-muted-foreground/60" />
    </Link>
  );
}

function HomePage() {
  return (
    <div className="space-y-6">
      <PageHeader brand title="القائمة الرئيسية" subtitle="أرسل رسائل الفواتير لمشتركيك بخطوات بسيطة" />
      <div className="space-y-4">
        <MenuCard
          to="/templates"
          title="الرسائل الجاهزة"
          description="إدارة الرسائل المحفوظة مسبقاً ومراجعتها وإرسالها"
          Icon={ClipboardList}
        />
        <MenuCard
          to="/campaigns"
          title="تجهيز الحملات"
          description="استيراد الفواتير وربط المتغيرات واختيار القالب ثم الإرسال الجماعي"
          Icon={Layers}
        />
      </div>
    </div>
  );
}
