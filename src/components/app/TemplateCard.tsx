import { Copy, Eye, Loader2, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { ConfirmDelete, errorMessage } from "@/components/app/ui-bits";
import { PlaceholderChips } from "@/components/app/TemplateForm";
import { extractPlaceholders } from "@/lib/hodhod-rules";
import { deleteTemplate, formatArabicDate, type MessageTemplate } from "@/lib/templates";
import { cn } from "@/lib/utils";

function ActionButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-10 items-center justify-center rounded-xl border transition active:scale-95 disabled:opacity-50 [&_svg]:size-[18px]",
        danger
          ? "border-destructive/30 bg-destructive-soft text-destructive hover:bg-destructive/10"
          : "bg-card text-muted-foreground hover:border-primary-border hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function TemplateCard({
  template,
  disabled,
  duplicating,
  settingDefault,
  onEdit,
  onPreview,
  onDuplicate,
  onSetDefault,
  onDeleted,
}: {
  template: MessageTemplate;
  disabled: boolean;
  duplicating: boolean;
  settingDefault: boolean;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onSetDefault: () => void;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const placeholders = extractPlaceholders(template.body);

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTemplate(template.id);
      onDeleted(template.id);
    } catch (err) {
      setDeleteError(errorMessage(err, "تعذر حذف القالب. حاول مرة أخرى."));
      setDeleting(false);
    }
  };

  return (
    <article
      className={cn(
        "space-y-3 rounded-[22px] border p-4 shadow-card transition",
        template.is_default ? "border-primary/40 bg-primary-soft" : "bg-card",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 className="truncate text-[17px] font-bold text-foreground">{template.title}</h3>
          <p className="text-xs text-muted-foreground">
            {formatArabicDate(template.updated_at)} · {template.body.length} حرف
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <ActionButton label="حذف القالب" danger onClick={() => setConfirming(true)} disabled={disabled}>
            <Trash2 />
          </ActionButton>
          <ActionButton label="تعديل القالب" onClick={onEdit} disabled={disabled}>
            <Pencil />
          </ActionButton>
          <ActionButton label="نسخ القالب" onClick={onDuplicate} disabled={disabled || duplicating}>
            {duplicating ? <Loader2 className="animate-spin" /> : <Copy />}
          </ActionButton>
          <ActionButton label="معاينة القالب" onClick={onPreview}>
            <Eye />
          </ActionButton>
        </div>
      </div>

      <p className="line-clamp-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{template.body}</p>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        {placeholders.length > 0 ? <PlaceholderChips names={placeholders} /> : <span />}
        {template.is_default ? (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
            <ShieldCheck className="size-5 fill-primary text-primary-foreground" />
            افتراضي
          </span>
        ) : (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={disabled || settingDefault}
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition hover:text-primary disabled:opacity-50"
          >
            {settingDefault ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-5" />}
            تعيين كافتراضي
          </button>
        )}
      </div>

      {confirming ? (
        <ConfirmDelete
          text="هل تريد حذف هذا القالب نهائياً؟"
          busy={deleting}
          error={deleteError}
          onCancel={() => setConfirming(false)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </article>
  );
}
