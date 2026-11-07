import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, EmptyState, ErrorCard, LoadingCard, PageHeader } from "@/components/app/ui-bits";
import { TemplateCard } from "@/components/app/TemplateCard";
import { TemplateForm } from "@/components/app/TemplateForm";
import { templatesQuery } from "@/lib/queries";
import type { MessageTemplate } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({
    meta: [
      { title: "القوالب — هدهد الفواتير" },
      { name: "description", content: "أنشئ رسائل جاهزة تستخدمها في حملاتك مع دعم المتغيرات." },
      { property: "og:title", content: "القوالب — هدهد الفواتير" },
      { property: "og:description", content: "رسائل جاهزة مع متغيرات مثل الاسم والمبلغ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(templatesQuery),
  pendingComponent: () => (
    <div className="space-y-4">
      <PageHeader title="القوالب" subtitle="أنشئ رسائل جاهزة تستخدمها في حملاتك مع دعم المتغيرات" />
      <LoadingCard />
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="space-y-4">
      <PageHeader title="القوالب" subtitle="أنشئ رسائل جاهزة تستخدمها في حملاتك مع دعم المتغيرات" />
      <ErrorCard message="تعذر تحميل القوالب." onRetry={reset} />
    </div>
  ),
  component: TemplatesPage,
});

type FormState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; template: MessageTemplate };

function TemplatesPage() {
  const queryClient = useQueryClient();
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const [form, setForm] = useState<FormState>({ mode: "closed" });

  const setTemplates = (fn: (cur: MessageTemplate[]) => MessageTemplate[]) =>
    queryClient.setQueryData(templatesQuery.queryKey, (cur: MessageTemplate[] | undefined) => fn(cur ?? []));

  const handleSaved = (saved: MessageTemplate) => {
    setTemplates((cur) => [saved, ...cur.filter((t) => t.id !== saved.id)]);
    setForm({ mode: "closed" });
  };

  const handleDeleted = (id: string) => {
    setTemplates((cur) => cur.filter((t) => t.id !== id));
    setForm((cur) => (cur.mode === "edit" && cur.template.id === id ? { mode: "closed" } : cur));
  };

  const showEmpty = templates.length === 0 && form.mode === "closed";

  return (
    <div className="space-y-4">
      <PageHeader title="القوالب" subtitle="أنشئ رسائل جاهزة تستخدمها في حملاتك مع دعم المتغيرات" />

      {showEmpty ? (
        <div className="space-y-6">
          <EmptyState Icon={FileText} title="لا توجد قوالب بعد" description="أنشئ قالبك الأول لاستخدامه في إرسال الفواتير" />
          <Button size="xl" className="w-full" onClick={() => setForm({ mode: "create" })}>
            <Plus />
            إنشاء قالب جديد
          </Button>
        </div>
      ) : (
        <>
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              disabled={form.mode !== "closed"}
              onEdit={() => setForm({ mode: "edit", template: t })}
              onDeleted={handleDeleted}
            />
          ))}

          {form.mode === "closed" ? (
            <Button variant="dashed" size="tall" className="w-full" onClick={() => setForm({ mode: "create" })}>
              <Plus />
              إضافة قالب جديد
            </Button>
          ) : (
            <Card>
              <TemplateForm
                key={form.mode === "edit" ? form.template.id : "create"}
                template={form.mode === "edit" ? form.template : null}
                onSaved={handleSaved}
                onCancel={() => setForm({ mode: "closed" })}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
