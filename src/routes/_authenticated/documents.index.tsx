import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, FileStack, FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import { Card, EmptyState, ErrorCard, ErrorText, Field, LoadingCard, PageHeader, SectionTitle, inputClass, errorMessage } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { GENERIC_ERROR, MAX_ROWS_PER_BATCH } from "@/lib/hodhod-rules";
import { BATCH_STATUS_LABELS, SOURCE_LABELS, batchesQuery, createBatchFromFile, type Batch } from "@/lib/phone-api";
import { templatesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/documents/")({
  head: () => ({
    meta: [
      { title: "تجهيز الرسائل من المستندات — هدهد الفواتير" },
      { name: "description", content: "ارفع ملف Excel أو CSV أو فاتورة PDF واختر قالباً لتجهيز رسالة لكل عميل." },
      { property: "og:title", content: "تجهيز الرسائل — هدهد الفواتير" },
      { property: "og:description", content: "من ملف الفواتير إلى رسالة جاهزة لكل عميل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="تجهيز الرسائل" subtitle="ارفع ملف العملاء أو الفواتير واختر القالب، وتُجهَّز رسالة لكل عميل" />
      <UploadCard />
      <BatchList />
    </div>
  );
}

function UploadCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const templates = useQuery(templatesQuery);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("اختر ملفاً أولاً.");
    if (!templateId) return setError("اختر قالب الرسالة.");
    setBusy(true);
    try {
      const result = await createBatchFromFile(file, templateId);
      await queryClient.invalidateQueries({ queryKey: batchesQuery.queryKey });
      navigate({
        to: "/documents/$batchId",
        params: { batchId: result.batch.id },
        search: result.missing_variables.length ? { missing: result.missing_variables.join(",") } : {},
      });
    } catch (err) {
      setError(errorMessage(err, GENERIC_ERROR));
      setBusy(false);
    }
  }

  const list = templates.data ?? [];

  return (
    <Card>
      <SectionTitle>دفعة جديدة</SectionTitle>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="الملف" Icon={FileText} hint={`CSV أو Excel أو PDF — حتى ${MAX_ROWS_PER_BATCH} عميل`} htmlFor="doc-file">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-primary-border bg-primary-soft px-4 py-6 text-center transition hover:bg-primary-border/30"
          >
            <Upload className="size-6 text-primary" />
            <span className="text-sm font-semibold text-foreground">{file ? file.name : "اضغط لاختيار ملف"}</span>
            <span className="text-xs text-muted-foreground">
              {file ? `${(file.size / 1024).toFixed(0)} ك.ب` : "يتعرف تلقائياً على أعمدة الاسم والجوال والمبلغ"}
            </span>
          </button>
          <input
            ref={fileRef}
            id="doc-file"
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="قالب الرسالة" Icon={FileStack} htmlFor="doc-template">
          <select
            id="doc-template"
            className={inputClass}
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={templates.isLoading}
          >
            <option value="">{templates.isLoading ? "جاري التحميل..." : "اختر قالباً"}</option>
            {list.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
        {!templates.isLoading && list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا توجد قوالب بعد.{" "}
            <Link to="/templates" className="font-semibold text-primary">
              أنشئ قالباً
            </Link>
          </p>
        ) : null}
        {busy && file?.name.toLowerCase().endsWith(".pdf") ? (
          <p className="text-sm text-muted-foreground">نقرأ الفاتورة بالذكاء الاصطناعي، قد يستغرق ذلك دقيقة.</p>
        ) : null}
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button type="submit" size="xl" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : "جهّز الرسائل"}
        </Button>
      </form>
    </Card>
  );
}

function BatchRow({ batch }: { batch: Batch }) {
  return (
    <Link
      to="/documents/$batchId"
      params={{ batchId: batch.id }}
      className="flex items-center gap-3 rounded-[20px] border bg-card p-4 shadow-card transition hover:border-primary-border"
    >
      <div className="flex-1 space-y-1">
        <p className="font-bold text-foreground">{batch.source_name || "دفعة"}</p>
        <p className="text-xs text-muted-foreground">
          {SOURCE_LABELS[batch.source_type]} · {batch.template_title} · {batch.total_count} رسالة
        </p>
        <p className="text-xs font-semibold text-primary">
          {BATCH_STATUS_LABELS[batch.status]} — أُرسلت {batch.sent_count} من {batch.total_count - batch.skipped_count}
        </p>
      </div>
      <ChevronLeft className="size-5 text-muted-foreground/60" />
    </Link>
  );
}

function BatchList() {
  const { data, isLoading, isError, refetch } = useQuery(batchesQuery);
  return (
    <div className="space-y-3">
      <SectionTitle>الدفعات السابقة</SectionTitle>
      {isLoading ? (
        <LoadingCard />
      ) : isError ? (
        <ErrorCard message="تعذر تحميل الدفعات." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState Icon={FileStack} title="لا توجد دفعات بعد" description="ارفع أول ملف لتجهيز رسائل عملائك." />
      ) : (
        data.map((b) => <BatchRow key={b.id} batch={b} />)
      )}
    </div>
  );
}
