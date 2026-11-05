import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Copy, Phone, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Card, ConfirmDelete, ErrorCard, LoadingCard, PageHeader, errorMessage } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { GENERIC_ERROR } from "@/lib/hodhod-rules";
import {
  BATCH_STATUS_LABELS,
  MESSAGE_STATUS_LABELS,
  SOURCE_LABELS,
  batchQuery,
  batchesQuery,
  deleteBatch,
  type BatchMessage,
} from "@/lib/phone-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documents/$batchId")({
  validateSearch: (search: Record<string, unknown>): { missing?: string } =>
    typeof search["missing"] === "string" ? { missing: search["missing"] } : {},
  head: () => ({
    meta: [
      { title: "الرسائل المجهزة — هدهد الفواتير" },
      { name: "description", content: "راجع الرسائل المجهزة لكل عميل وحالة إرسالها من الجوال." },
      { property: "og:title", content: "الرسائل المجهزة — هدهد الفواتير" },
      { property: "og:description", content: "رسائل جاهزة لكل عميل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BatchPage,
});

const STATUS_STYLES: Record<BatchMessage["status"], string> = {
  pending: "bg-primary-soft text-primary",
  sent: "bg-success-soft text-success",
  failed: "bg-destructive-soft text-destructive",
  skipped: "bg-warning-soft text-warning",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted px-3 py-2 text-center">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MessageItem({ m }: { m: BatchMessage }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(m.body);
      toast.success("تم نسخ الرسالة");
    } catch {
      toast.error("تعذر النسخ");
    }
  }
  return (
    <li className="space-y-2 rounded-2xl border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-foreground">
            {m.position}. {m.recipient_name || "بدون اسم"}
          </p>
          <p className="ltr-field flex items-center justify-end gap-1 text-xs text-muted-foreground">
            {m.phone ?? "—"}
            <Phone className="size-3" />
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", STATUS_STYLES[m.status])}>
          {MESSAGE_STATUS_LABELS[m.status]}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{m.body}</p>
      {m.error ? <p className="text-xs font-semibold text-destructive">{m.error}</p> : null}
      <Button variant="soft" size="sm" className="rounded-lg" onClick={copy}>
        <Copy />
        نسخ
      </Button>
    </li>
  );
}

function BatchPage() {
  const { batchId } = Route.useParams();
  const { missing } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery(batchQuery(batchId));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function onDelete() {
    setBusy(true);
    setDeleteError(null);
    try {
      await deleteBatch(batchId);
      await queryClient.invalidateQueries({ queryKey: batchesQuery.queryKey });
      navigate({ to: "/documents" });
    } catch (err) {
      setDeleteError(errorMessage(err, GENERIC_ERROR));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/documents" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ArrowRight className="size-4" />
        كل الدفعات
      </Link>
      {isLoading ? (
        <LoadingCard />
      ) : isError || !data ? (
        <ErrorCard message="تعذر تحميل الدفعة." onRetry={() => refetch()} />
      ) : (
        <>
          <PageHeader
            title={data.batch.source_name || "دفعة"}
            subtitle={`${SOURCE_LABELS[data.batch.source_type]} · قالب «${data.batch.template_title}» · ${BATCH_STATUS_LABELS[data.batch.status]}`}
          />
          <div className="grid grid-cols-4 gap-2">
            <Stat label="جاهزة" value={data.batch.ready_count} />
            <Stat label="أُرسلت" value={data.batch.sent_count} />
            <Stat label="فشلت" value={data.batch.failed_count} />
            <Stat label="مستبعدة" value={data.batch.skipped_count} />
          </div>
          {missing ? (
            <div className="flex gap-2 rounded-2xl border border-warning/30 bg-warning-soft p-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <p>
                بعض متغيرات القالب لم نجدها في الملف وتُركت فارغة:{" "}
                <span className="font-bold">{missing.split(",").map((v) => `{{${v}}}`).join("، ")}</span>
              </p>
            </div>
          ) : null}
          <p className="rounded-2xl bg-primary-soft p-3 text-sm leading-relaxed text-foreground">
            هذه الرسائل متاحة الآن لتطبيق الجوال، ليرسلها عبر بوابة الاتصالات المربوطة ويحدّث حالتها.
          </p>
          <Card>
            <ul className="space-y-3">
              {data.messages.map((m) => (
                <MessageItem key={m.id} m={m} />
              ))}
            </ul>
          </Card>
          {confirm ? (
            <ConfirmDelete
              text="حذف هذه الدفعة وكل رسائلها؟"
              busy={busy}
              error={deleteError}
              onCancel={() => setConfirm(false)}
              onConfirm={onDelete}
            />
          ) : (
            <Button variant="danger" className="h-11 w-full rounded-xl" onClick={() => setConfirm(true)}>
              <Trash2 />
              حذف الدفعة
            </Button>
          )}
        </>
      )}
    </div>
  );
}
