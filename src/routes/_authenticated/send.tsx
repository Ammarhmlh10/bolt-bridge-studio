import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, FileSpreadsheet, FileText, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Card, ErrorText, PageHeader, SectionTitle, errorMessage } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { GENERIC_ERROR, MAX_DOCUMENT_BYTES, MAX_ROWS_PER_BATCH } from "@/lib/hodhod-rules";
import { prepareMessages } from "@/lib/message-prep";
import { SOURCE_LABELS, batchesQuery, createBatchFromRecords, parseDocument, type ParsedDocument } from "@/lib/phone-api";
import { templatesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/send")({
  head: () => ({
    meta: [
      { title: "إرسال من ملف — هدهد الفواتير" },
      { name: "description", content: "اختر ملف الفواتير من جوالك، راجع العملاء، اختر القالب، ثم أرسل لكل عميل رسالته." },
      { property: "og:title", content: "إرسال من ملف — هدهد الفواتير" },
      { property: "og:description", content: "من ملف الفواتير إلى رسالة لكل عميل في ثلاث خطوات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SendWizard,
});

const STEPS = ["الملف", "القالب", "الإرسال"] as const;

const FIELD_CHIPS = [
  { key: "name", label: "الاسم" },
  { key: "phone", label: "الجوال" },
  { key: "amount", label: "المبلغ" },
  { key: "invoice_number", label: "رقم الفاتورة" },
  { key: "due_date", label: "الاستحقاق" },
] as const;

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="خطوات الإرسال">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-brand-gradient text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {i < step ? <Check className="size-4" /> : i + 1}
          </span>
          <span className={cn("text-sm font-semibold", i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
          {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
        </li>
      ))}
    </ol>
  );
}

function SendWizard() {
  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  return (
    <div className="space-y-5">
      <PageHeader title="إرسال من ملف" subtitle="اختر ملف العملاء أو الفواتير من جوالك، ونجهّز لكل عميل رسالته" />
      <Stepper step={doc ? 1 : 0} />
      {doc ? <TemplateStep doc={doc} onChangeFile={() => setDoc(null)} /> : <FileStep onParsed={setDoc} />}
    </div>
  );
}

function FileStep({ onParsed }: { onParsed: (doc: ParsedDocument) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_DOCUMENT_BYTES) return setError("حجم الملف أكبر من 5 ميغابايت.");
    setBusyName(file.name);
    try {
      onParsed(await parseDocument(file));
    } catch (err) {
      setError(errorMessage(err, GENERIC_ERROR));
      setBusyName(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const isPdf = busyName?.toLowerCase().endsWith(".pdf");

  return (
    <Card>
      <input
        ref={inputRef}
        id="send-file"
        type="file"
        aria-label="اختر ملف العملاء"
        accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={!!busyName}
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary-border bg-primary-soft px-4 py-10 text-center transition active:scale-[0.99] disabled:opacity-80"
      >
        {busyName ? (
          <>
            <Loader2 className="size-10 animate-spin text-primary" />
            <span className="font-bold text-foreground">نقرأ «{busyName}»...</span>
            <span className="text-sm text-muted-foreground">
              {isPdf ? "نقرأ الفاتورة بالذكاء الاصطناعي، قد يستغرق ذلك دقيقة." : "لحظات ونعرض لك العملاء."}
            </span>
          </>
        ) : (
          <>
            <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-fab">
              <Upload className="size-7" />
            </span>
            <span className="text-lg font-bold text-foreground">اختر الملف من جوالك</span>
            <span className="text-sm text-muted-foreground">Excel أو CSV أو فاتورة PDF — حتى {MAX_ROWS_PER_BATCH} عميل</span>
          </>
        )}
      </button>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        نقرأ الملف لتجهيز الرسائل فقط ولا نحتفظ به. نتعرف تلقائياً على أعمدة الاسم والجوال والمبلغ بالعربي أو الإنجليزي.
      </p>
    </Card>
  );
}

function TemplateStep({ doc, onChangeFile }: { doc: ParsedDocument; onChangeFile: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const templates = useQuery(templatesQuery);
  const [templateId, setTemplateId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = templates.data ?? [];
  const selected = list.find((t) => t.id === templateId) ?? null;
  const preview = useMemo(() => (selected ? prepareMessages(selected.body, doc.records) : null), [selected, doc.records]);
  const ready = preview?.messages.filter((m) => m.status === "pending").length ?? 0;
  const firstReady = preview?.messages.find((m) => m.status === "pending") ?? null;

  async function onPrepare() {
    if (!selected) return setError("اختر قالب الرسالة.");
    setError(null);
    setBusy(true);
    try {
      const result = await createBatchFromRecords(doc, selected.id);
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

  const Icon = doc.source_type === "pdf" ? FileText : FileSpreadsheet;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
            <Icon className="size-6 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-foreground">{doc.source_name}</p>
            <p className="text-sm text-muted-foreground">
              {SOURCE_LABELS[doc.source_type]} · {doc.count} عميل
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onChangeFile} disabled={busy}>
            <RefreshCw />
            تغيير
          </Button>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="الأعمدة المكتشفة">
          {FIELD_CHIPS.map((f) => {
            const found = !!doc.detected_fields[f.key];
            return (
              <span
                key={f.key}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                  found ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {found ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                {f.label}
              </span>
            );
          })}
        </div>
        {!doc.detected_fields.phone ? (
          <p className="rounded-xl bg-warning-soft p-3 text-sm text-foreground">
            لم نجد عمود رقم الجوال. سمِّ العمود «الجوال» أو «Phone» حتى نتمكن من الإرسال.
          </p>
        ) : null}
      </Card>

      <section className="space-y-3">
        <SectionTitle>اختر قالب الرسالة</SectionTitle>
        {templates.isLoading ? (
          <Card>
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
          </Card>
        ) : list.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">لا توجد قوالب بعد.</p>
            <Button asChild variant="soft" className="h-11 w-full rounded-xl">
              <Link to="/templates">أنشئ قالباً</Link>
            </Button>
          </Card>
        ) : (
          <div role="radiogroup" aria-label="القوالب" className="space-y-2">
            {list.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === templateId}
                onClick={() => setTemplateId(t.id)}
                className={cn(
                  "w-full space-y-1 rounded-2xl border bg-card p-4 text-start shadow-card transition",
                  t.id === templateId ? "border-primary ring-2 ring-primary/20" : "hover:border-primary-border",
                )}
              >
                <span className="block font-bold text-foreground">{t.title}</span>
                <span className="line-clamp-2 block text-sm text-muted-foreground">{t.body}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {preview ? (
        <Card>
          <SectionTitle>معاينة أول رسالة</SectionTitle>
          {firstReady ? (
            <div className="space-y-2">
              <p className="ltr-field text-xs text-muted-foreground">{firstReady.phone}</p>
              <p className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground">
                {firstReady.body}
              </p>
            </div>
          ) : (
            <p className="text-sm text-destructive">لا يوجد عميل برقم جوال صالح في هذا الملف.</p>
          )}
          <p className="text-sm text-foreground">
            <span className="font-bold text-success">{ready} جاهزة</span>
            {preview.messages.length - ready > 0 ? (
              <span className="text-muted-foreground"> · {preview.messages.length - ready} بدون رقم صالح ستُستبعد</span>
            ) : null}
          </p>
          {preview.missingVariables.length ? (
            <p className="rounded-xl bg-warning-soft p-3 text-sm text-foreground">
              متغيرات غير موجودة في الملف وستبقى فارغة:{" "}
              <span className="font-bold">{preview.missingVariables.map((v) => `{{${v}}}`).join("، ")}</span>
            </p>
          ) : null}
        </Card>
      ) : null}

      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button size="xl" className="w-full" onClick={onPrepare} disabled={busy || !selected || ready === 0}>
        {busy ? <Loader2 className="animate-spin" /> : `جهّز ${ready || ""} رسالة وتابع للإرسال`}
      </Button>
    </div>
  );
}
