import { CheckCircle2, FileText, Loader2, MessageSquare, Plus, Sparkles, Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppSheet } from "@/components/app/AppSheet";
import { ErrorText, Field, errorMessage, inputClass } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MAX_TEMPLATE_BODY, MAX_TEMPLATE_TITLE, extractPlaceholders } from "@/lib/hodhod-rules";
import { toVariableName } from "@/lib/message-prep";
import { createTemplate, readDocumentColumns, updateTemplate, type MessageTemplate } from "@/lib/templates";
import { cn } from "@/lib/utils";

/** Columns offered when no file has been opened yet. */
const COMMON_COLUMNS = ["الاسم", "المبلغ", "تاريخ_الاستحقاق", "رقم_الفاتورة"];

function validate(title: string, body: string): string | null {
  if (title.trim().length === 0) return "أدخل اسماً للقالب";
  if (title.trim().length > MAX_TEMPLATE_TITLE) return `العنوان يجب ألا يتجاوز ${MAX_TEMPLATE_TITLE} حرفاً`;
  if (body.trim().length === 0) return "أدخل نص الرسالة";
  if (body.length > MAX_TEMPLATE_BODY) return `نص الرسالة يجب ألا يتجاوز ${MAX_TEMPLATE_BODY} حرفاً`;
  return null;
}

const label = (name: string) => name.replace(/_/g, " ");

export function TemplateEditorSheet({
  open,
  template,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  template: MessageTemplate | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (t: MessageTemplate) => void;
}) {
  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title={template ? "تعديل القالب" : "قالب جديد"}>
      {open ? <TemplateForm key={template?.id ?? "new"} template={template} onSaved={onSaved} /> : null}
    </AppSheet>
  );
}

function TemplateForm({ template, onSaved }: { template: MessageTemplate | null; onSaved: (t: MessageTemplate) => void }) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(template?.title ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docColumns, setDocColumns] = useState<string[]>([]);

  useEffect(() => {
    const names = readDocumentColumns().map(toVariableName).filter(Boolean);
    setDocColumns(Array.from(new Set(names)));
  }, []);

  const placeholders = extractPlaceholders(body);
  const columns = docColumns.length ? docColumns : COMMON_COLUMNS;

  function edit(next: string) {
    setBody(next.slice(0, MAX_TEMPLATE_BODY));
    setError(null);
  }

  function insert(name: string) {
    const token = `{{${name}}}`;
    const el = bodyRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const before = body.slice(0, start);
    const spacer = before && !/\s$/.test(before) ? " " : "";
    edit(before + spacer + token + body.slice(end));
    requestAnimationFrame(() => {
      const pos = start + spacer.length + token.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  function remove(name: string) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    edit(body.replace(new RegExp(`\\s?\\{\\{\\s*${escaped}\\s*\\}\\}`, "gu"), "").trim());
  }

  const handleSave = async () => {
    const v = validate(title, body);
    if (v) return setError(v);
    setSaving(true);
    setError(null);
    try {
      const saved = template ? await updateTemplate(template.id, { title, body }) : await createTemplate({ title, body });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err, "تعذر حفظ القالب. حاول مرة أخرى."));
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-2xl border bg-muted px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <Type className="size-4 shrink-0 text-muted-foreground" />
        <label htmlFor="tpl-title" className="shrink-0 text-sm text-muted-foreground">
          القالب:
        </label>
        <input
          id="tpl-title"
          value={title}
          maxLength={MAX_TEMPLATE_TITLE}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          placeholder="مثال: تأكيد الدفع"
          className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
          disabled={saving}
        />
      </div>

      <Field label="نص الرسالة" Icon={MessageSquare} hint={`${MAX_TEMPLATE_BODY - body.length} حرف متبقٍّ`} htmlFor="tpl-body">
        <textarea
          ref={bodyRef}
          id="tpl-body"
          value={body}
          maxLength={MAX_TEMPLATE_BODY}
          rows={5}
          onChange={(e) => edit(e.target.value)}
          placeholder="عزيزي {{الاسم}}، تم استلام مبلغ {{المبلغ}} ريال. رقم الفاتورة: {{رقم_الفاتورة}}"
          className={`${inputClass} min-h-36 resize-y rounded-2xl leading-relaxed`}
          disabled={saving}
        />
      </Field>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="size-4 text-primary" />
          المتغيرات المضمنة في الرسالة ({placeholders.length}):
        </p>
        {placeholders.length ? (
          <div className="flex flex-wrap gap-2">
            {placeholders.map((p) => (
              <span key={p} className="rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                {`{{${p}}}`}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">أضف متغيراً من الأعمدة بالأسفل ليُملأ تلقائياً لكل عميل.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <FileText className="size-4 text-primary" />
          عناوين الأعمدة المستخرجة من المستند ({docColumns.length})
        </p>
        {docColumns.length === 0 ? (
          <p className="text-xs text-muted-foreground">لم تفتح ملفاً بعد، هذه الأعمدة الأكثر استخداماً.</p>
        ) : null}
        <ul className="divide-y overflow-hidden rounded-2xl border">
          {columns.map((c, i) => {
            const used = placeholders.includes(c);
            return (
              <li key={c} className={cn("flex items-center gap-3 px-3 py-2", i % 2 === 1 && "bg-muted/60")}>
                <Checkbox
                  checked={used}
                  onCheckedChange={(v) => (v ? insert(c) : remove(c))}
                  aria-label={`استخدام ${label(c)} في الرسالة`}
                  className="size-6 rounded-md"
                  disabled={saving}
                />
                <span className="min-w-0 flex-1">
                  <span className="inline-block max-w-full truncate rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
                    {label(c)}
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 rounded-lg px-4 font-bold"
                  onClick={() => insert(c)}
                  disabled={saving}
                  aria-label={`إضافة ${label(c)} إلى الرسالة`}
                >
                  <Plus />
                  إضافة
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      {error ? <ErrorText>{error}</ErrorText> : null}

      <Button size="xl" className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? (
          <Loader2 className="animate-spin" />
        ) : (
          <>
            <CheckCircle2 />
            {template ? "حفظ التعديلات" : "حفظ القالب"}
          </>
        )}
      </Button>
    </div>
  );
}

export function PlaceholderChips({ names }: { names: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {names.map((n) => (
        <span key={n} className="rounded-full border border-primary-border bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
          {`{{${n}}}`}
        </span>
      ))}
    </div>
  );
}
