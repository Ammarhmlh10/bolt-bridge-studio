import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSheet } from "@/components/app/AppSheet";
import { TemplateCard } from "@/components/app/TemplateCard";
import { TemplateEditorSheet } from "@/components/app/TemplateForm";
import { EmptyState, ErrorCard, LoadingCard, PageHeader, errorMessage } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { templatesQuery } from "@/lib/queries";
import { duplicateTemplate, previewWithSample, setDefaultTemplate, sortTemplates, type MessageTemplate } from "@/lib/templates";

const SUBTITLE = "أنشئ رسائل جاهزة تستخدمها في حملاتك";

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
      <PageHeader title="القوالب" subtitle={SUBTITLE} />
      <LoadingCard />
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="space-y-4">
      <PageHeader title="القوالب" subtitle={SUBTITLE} />
      <ErrorCard message="تعذر تحميل القوالب." onRetry={reset} />
    </div>
  ),
  component: TemplatesPage,
});

type Editor = { open: false } | { open: true; template: MessageTemplate | null };

function TemplatesPage() {
  const queryClient = useQueryClient();
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const [editor, setEditor] = useState<Editor>({ open: false });
  const [preview, setPreview] = useState<MessageTemplate | null>(null);
  const [working, setWorking] = useState<{ id: string; kind: "copy" | "default" } | null>(null);

  const setTemplates = (fn: (cur: MessageTemplate[]) => MessageTemplate[]) =>
    queryClient.setQueryData(templatesQuery.queryKey, (cur: MessageTemplate[] | undefined) => sortTemplates(fn(cur ?? [])));

  const handleSaved = (saved: MessageTemplate) => {
    setTemplates((cur) => [saved, ...cur.filter((t) => t.id !== saved.id)]);
    setEditor({ open: false });
    toast.success("تم حفظ القالب");
  };

  const handleDuplicate = async (t: MessageTemplate) => {
    setWorking({ id: t.id, kind: "copy" });
    try {
      const copy = await duplicateTemplate(t);
      setTemplates((cur) => [copy, ...cur]);
      toast.success("تم نسخ القالب");
    } catch (err) {
      toast.error(errorMessage(err, "تعذر نسخ القالب."));
    } finally {
      setWorking(null);
    }
  };

  const handleSetDefault = async (t: MessageTemplate) => {
    setWorking({ id: t.id, kind: "default" });
    try {
      await setDefaultTemplate(t.id);
      setTemplates((cur) => cur.map((x) => ({ ...x, is_default: x.id === t.id })));
      toast.success(`«${t.title}» هو القالب الافتراضي الآن`);
    } catch (err) {
      toast.error(errorMessage(err, "تعذر تعيين القالب الافتراضي."));
    } finally {
      setWorking(null);
    }
  };

  const openNew = () => setEditor({ open: true, template: null });

  return (
    <div className="space-y-4">
      <PageHeader
        title="القوالب"
        subtitle={SUBTITLE}
        action={
          <Button size="tall" className="rounded-2xl px-5 font-bold" onClick={openNew}>
            <Plus />
            قالب جديد
          </Button>
        }
      />

      {templates.length === 0 ? (
        <div className="space-y-6 pt-2">
          <EmptyState Icon={FileText} title="لا توجد قوالب بعد" description="أنشئ قالبك الأول لاستخدامه في إرسال الفواتير" />
          <Button size="xl" className="w-full" onClick={openNew}>
            <Plus />
            إنشاء قالب جديد
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              disabled={working !== null}
              duplicating={working?.id === t.id && working.kind === "copy"}
              settingDefault={working?.id === t.id && working.kind === "default"}
              onEdit={() => setEditor({ open: true, template: t })}
              onPreview={() => setPreview(t)}
              onDuplicate={() => handleDuplicate(t)}
              onSetDefault={() => handleSetDefault(t)}
              onDeleted={(id) => setTemplates((cur) => cur.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}

      <TemplateEditorSheet
        open={editor.open}
        template={editor.open ? editor.template : null}
        onOpenChange={(open) => !open && setEditor({ open: false })}
        onSaved={handleSaved}
      />

      <AppSheet
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
        title={preview ? `معاينة: ${preview.title}` : "معاينة"}
        description="هكذا تصل الرسالة للعميل (بقيم تجريبية)."
      >
        {preview ? (
          <div className="space-y-4">
            <p className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground">
              {previewWithSample(preview.body)}
            </p>
            <Button
              variant="soft"
              className="h-11 w-full rounded-xl"
              onClick={() => {
                const t = preview;
                setPreview(null);
                setEditor({ open: true, template: t });
              }}
            >
              تعديل القالب
            </Button>
          </div>
        ) : null}
      </AppSheet>
    </div>
  );
}
