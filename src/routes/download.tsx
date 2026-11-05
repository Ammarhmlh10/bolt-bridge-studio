import { Link, createFileRoute } from "@tanstack/react-router";
import { Apple, Globe, Play, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageIntro, SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "حمّل تطبيق هدهد الفواتير — iPhone و Android" },
      { name: "description", content: "حمّل تطبيق هدهد الفواتير على جوالك لاستلام الرسائل الجاهزة وإرسالها لعملائك." },
      { property: "og:title", content: "حمّل تطبيق هدهد الفواتير" },
      { property: "og:description", content: "استلم الرسائل الجاهزة على جوالك وأرسلها عبر بوابتك المفضلة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DownloadPage,
});

function StoreCard({ Icon, store, platform }: { Icon: LucideIcon; store: string; platform: string }) {
  return (
    <div className="flex items-center gap-4 rounded-[20px] border bg-card p-5 shadow-card">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
        <Icon className="size-7" />
      </span>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{platform}</p>
        <p className="text-lg font-bold text-foreground">{store}</p>
      </div>
      <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-bold text-warning">قريباً</span>
    </div>
  );
}

function DownloadPage() {
  return (
    <SiteLayout>
      <PageIntro
        eyebrow="حمّل التطبيق"
        title="هدهد الفواتير في جيبك"
        subtitle="يستلم التطبيق الرسائل الجاهزة من الخادم ويرسلها مباشرة عبر بوابة الاتصالات التي ربطتها."
      />
      <section className="mx-auto max-w-3xl space-y-4 px-4 pb-10">
        <StoreCard Icon={Apple} store="App Store" platform="لأجهزة iPhone" />
        <StoreCard Icon={Play} store="Google Play" platform="لأجهزة Android" />
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <div className="flex flex-col items-center gap-4 rounded-[24px] border border-primary-border bg-primary-soft p-8 text-center">
          <Globe className="size-9 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">لا تريد الانتظار؟</h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            استخدم نسخة الويب من متصفح جوالك الآن بنفس الحساب، وأضفها إلى الشاشة الرئيسية لتعمل كتطبيق.
          </p>
          <Button asChild size="xl">
            <Link to="/auth">
              <Smartphone />
              افتح التطبيق من المتصفح
            </Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
