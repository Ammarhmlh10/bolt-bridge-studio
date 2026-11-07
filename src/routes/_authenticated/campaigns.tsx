import { useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CheckCircle2,
  Layers,
  Loader2,
  Megaphone,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  EmptyState,
  ErrorCard,
  ErrorText,
  Field,
  LoadingCard,
  PageHeader,
  SectionTitle,
  Spinner,
  errorMessage,
  inputClass,
} from "@/components/app/ui-bits";
import { fetchSubscribers, sendCampaign, type Campaign } from "@/lib/campaigns.functions";
import type { Subscriber } from "@/lib/hodhod-rules";
import { campaignsQuery, gatewayQuery, templatesQuery } from "@/lib/queries";
import { formatArabicDate } from "@/lib/templates";
import { cn } from "@/lib/utils";

const SUBTITLE = "جهّز حملتك: اختر القالب والخدمة، ثم أرسل لمشتركيك";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({
    meta: [
      { title: "الحملات — هدهد الفواتير" },
      { name: "description", content: "اختر القالب والخدمة المرتبطة ثم أرسل رسائل الفواتير لكل مشتركيك." },
      { property: "og:title", content: "الحملات — هدهد الفواتير" },
      { property: "og:description", content: "إرسال جماعي لرسائل الفواتير مع متابعة النتائج." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(campaignsQuery),
      context.queryClient.ensureQueryData(gatewayQuery),
      context.queryClient.ensureQueryData(templatesQuery),
    ]),
  pendingComponent: () => (
    <div className="space-y-4">
      <PageHeader title="الحملات" subtitle={SUBTITLE} />
      <LoadingCard />
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="space-y-4">
      <PageHeader title="الحملات" subtitle={SUBTITLE} />
      <ErrorCard message="تعذر تحميل الحملات." onRetry={reset} />
    </div>
  ),
  component: CampaignsPage,
});

type Step = "form" | "fetching" | "preview" | "sending" | "result";

const STATUS: Record<Campaign["status"], { label: string; Icon: LucideIcon; className: string }> = {
  draft: { label: "مسودة", Icon: Layers, className: "bg-muted text-muted-foreground" },
  sending: { label: "جاري الإرسال", Icon: Loader2, className: "bg-muted text-info" },
  completed: { label: "مكتملة", Icon: CheckCircle2, className: "bg-success-soft text-success" },
  failed: { label: "فاشلة", Icon: XCircle, className: "bg-destructive-soft text-destructive" },
};

function StatusBadge({ status }: { status: Campaign["status"] }) {
  const { label, Icon, className } = STATUS[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", className)}>
      <Icon className={cn("size-3.5", status === "sending" && "animate-spin")} />
      {label}
    </span>
  );
}

function Choice({
  selected,
  title,
  sub,
  ltrSub,
  onSelect,
}: {
  selected: boolean;
  title: string;
  sub: string;
  ltrSub?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-start transition",
        selected ? "border-primary bg-primary-soft" : "bg-background hover:border-primary-border",
      )}
    >
      <span
        className={cn(
          "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary" : "border-muted-foreground/40",
        )}
      >
        {selected ? <span className="size-2.5 rounded-full bg-primary" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-foreground">{title}</span>
        <span
          dir={ltrSub ? "ltr" : undefined}
          className={cn("line-clamp-2 block text-sm text-muted-foreground", ltrSub && "truncate text-end")}
        >
          {sub}
        </span>
      </span>
    </button>
  );
}

function CampaignsPage() {
  const queryClient = useQueryClient();
  const [{ data: campaigns }, { data: settings }, { data: templates }] = useSuspenseQueries({
    queries: [campaignsQuery, gatewayQuery, templatesQuery],
  });
  const fetchSubsFn = useServerFn(fetchSubscribers);
  const sendFn = useServerFn(sendCampaign);

  const [step, setStep] = useState<Step>("form");
  const [connectionId, setConnectionId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const hasConnections = settings.connections.length > 0;
  const hasTemplates = templates.length > 0;
  const canStart = connectionId !== "" && templateId !== "" && campaignName.trim().length > 0;
  const selectedTemplate = templates.find((t) => t.id === templateId);

  const reset = () => {
    setStep("form");
    setSubscribers([]);
    setSubsError(null);
    setResult(null);
    setSendError(null);
  };

  const handleFetch = async () => {
    setStep("fetching");
    setSubsError(null);
    try {
      const subs = await fetchSubsFn({ data: { connection_id: connectionId } });
      setSubscribers(subs);
      setStep("preview");
    } catch (err) {
      setSubsError(errorMessage(err, "تعذر جلب المشتركين."));
      setStep("form");
    }
  };

  const handleSend = async () => {
    setStep("sending");
    setSendError(null);
    try {
      const r = await sendFn({
        data: {
          connection_id: connectionId,
          template_id: templateId,
          campaign_name: campaignName,
          batch_size: settings.batch_size,
          max_retries: settings.max_retries,
        },
      });
      setResult({ sent: r.sent, failed: r.failed, total: r.total });
      setStep("result");
    } catch (err) {
      setSendError(errorMessage(err, "تعذر إرسال الحملة."));
      setStep("preview");
    } finally {
      queryClient.invalidateQueries({ queryKey: campaignsQuery.queryKey });
    }
  };

  const showEmpty = campaigns.length === 0 && step === "form" && !hasConnections && !hasTemplates;

  return (
    <div className="space-y-4">
      <PageHeader title="الحملات" subtitle={SUBTITLE} />

      {showEmpty ? (
        <EmptyState
          Icon={Megaphone}
          title="لا توجد حملات بعد"
          description="أضف خدمة مرتبطة وأنشئ قالباً أولاً، ثم ابدأ حملتك الأولى من هنا"
        />
      ) : (
        <>
          {step === "form" ? (
            <Card>
              <SectionTitle>حملة جديدة</SectionTitle>

              {!hasConnections ? (
                <Notice>لا توجد خدمات مرتبطة. أضف خدمة من صفحة الإعدادات أولاً.</Notice>
              ) : !hasTemplates ? (
                <Notice>لا توجد قوالب. أنشئ قالباً من تبويب القوالب أولاً.</Notice>
              ) : null}

              <Field label="اسم الحملة" Icon={Megaphone} htmlFor="camp-name">
                <input
                  id="camp-name"
                  value={campaignName}
                  maxLength={200}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="مثال: فواتير نوفمبر"
                  className={inputClass}
                />
              </Field>

              <Field label="الخدمة المرتبطة" Icon={Send}>
                <div role="radiogroup" aria-label="الخدمة المرتبطة" className="space-y-2">
                  {settings.connections.map((c) => (
                    <Choice
                      key={c.id}
                      selected={connectionId === c.id}
                      title={c.sender_name}
                      sub={c.endpoint_url}
                      ltrSub
                      onSelect={() => setConnectionId(c.id)}
                    />
                  ))}
                </div>
              </Field>

              <Field label="القالب" Icon={Layers}>
                <div role="radiogroup" aria-label="القالب" className="space-y-2">
                  {templates.map((t) => (
                    <Choice
                      key={t.id}
                      selected={templateId === t.id}
                      title={t.title}
                      sub={t.body}
                      onSelect={() => setTemplateId(t.id)}
                    />
                  ))}
                </div>
              </Field>

              {subsError ? <ErrorText>{subsError}</ErrorText> : null}

              <Button size="xl" className="w-full" onClick={handleFetch} disabled={!canStart}>
                <Users />
                جلب المشتركين
              </Button>
            </Card>
          ) : null}

          {step === "fetching" ? (
            <Card>
              <div className="flex flex-col items-center gap-3 py-6">
                <Spinner className="size-8" />
                <p className="font-semibold">جاري جلب المشتركين من هدهد…</p>
              </div>
            </Card>
          ) : null}

          {step === "preview" ? (
            <Card>
              <div className="flex items-center justify-between">
                <SectionTitle>مراجعة الحملة</SectionTitle>
                <Button variant="ghost" className="text-destructive" onClick={reset}>
                  إلغاء
                </Button>
              </div>
              <dl className="space-y-2 text-sm">
                <Row label="الحملة" value={campaignName} />
                {selectedTemplate ? <Row label="القالب" value={selectedTemplate.title} /> : null}
              </dl>
              <p className="flex items-center gap-2 font-bold">
                <Users className="size-4 text-primary" />
                {subscribers.length} مشترك
              </p>
              <ul className="divide-y rounded-xl border bg-background">
                {subscribers.slice(0, 5).map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="truncate font-semibold">{s.name || s.email}</span>
                    <span dir="ltr" className="truncate text-sm text-muted-foreground">
                      {s.email}
                    </span>
                  </li>
                ))}
                {subscribers.length > 5 ? (
                  <li className="px-3 py-2.5 text-sm text-muted-foreground">و {subscribers.length - 5} مشترك آخر…</li>
                ) : null}
              </ul>
              {sendError ? <ErrorText>{sendError}</ErrorText> : null}
              <Button size="xl" className="w-full" onClick={handleSend} disabled={subscribers.length === 0}>
                <Send />
                إرسال الحملة
              </Button>
            </Card>
          ) : null}

          {step === "sending" ? (
            <Card>
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Spinner className="size-8" />
                <p className="font-semibold">جاري إرسال الرسائل…</p>
                <p className="text-sm text-muted-foreground">قد يستغرق هذا بعض الوقت حسب عدد المشتركين</p>
              </div>
            </Card>
          ) : null}

          {step === "result" && result ? (
            <Card>
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 className="size-12 text-success" />
                <p className="text-xl font-bold">تم إرسال الحملة</p>
                <div className="grid w-full grid-cols-3 gap-2 text-center">
                  <Stat value={result.total} label="إجمالي" />
                  <Stat value={result.sent} label="نجح" className="text-success" />
                  <Stat value={result.failed} label="فشل" className="text-destructive" />
                </div>
                <Button size="xl" className="w-full" onClick={reset}>
                  حملة جديدة
                </Button>
              </div>
            </Card>
          ) : null}

          {campaigns.length > 0 ? (
            <Card>
              <SectionTitle>الحملات السابقة</SectionTitle>
              <ul className="space-y-3">
                {campaigns.map((c) => (
                  <li key={c.id} className="space-y-1.5 rounded-xl border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold">{c.name}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {c.sent_count} / {c.total_recipients} مرسلة
                      </span>
                      {c.failed_count > 0 ? <span className="text-destructive">{c.failed_count} فاشلة</span> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatArabicDate(c.created_at)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-sm font-semibold text-foreground">
      <AlertCircle className="mt-0.5 size-[18px] shrink-0 text-warning" />
      <span>{children}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
    </div>
  );
}

function Stat({ value, label, className }: { value: number; label: string; className?: string }) {
  return (
    <div className="rounded-xl bg-muted py-3">
      <p className={cn("text-2xl font-bold", className)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
