import { Loader2, MessageSquare, Type, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorText, Field, errorMessage, inputClass } from "@/components/app/ui-bits";
import { MAX_TEMPLATE_BODY, MAX_TEMPLATE_TITLE, extractPlaceholders } from "@/lib/hodhod-rules";
import { createTemplate, updateTemplate, type MessageTemplate } from "@/lib/templates";

function validate(title: string, body: string): string | null {
  if (title.trim().length === 0) return "أدخل اسماً للقالب";
  if (title.trim().length > MAX_TEMPLATE_TITLE) return `العنوان يجب ألا يتجاوز ${MAX_TEMPLATE_TITLE} حرفاً`;
  if (body.trim().length === 0) return "أدخل نص الرسالة";
  if (body.length > MAX_TEMPLATE_BODY) return `نص الرسالة يجب ألا يتجاوز ${MAX_TEMPLATE_BODY} حرفاً`;
  return null;
}

export function TemplateForm({
  template,
  onSaved,
  onCancel,
}: {
  template: MessageTemplate | null;
  onSaved: (t: MessageTemplate) => void;
  onCancel: () => void;
}) {
  const isEdit = template !== null;
  const [title, setTitle] = useState(template?.title ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } finally {
      setSaving(false);
    }
  };

  const placeholders = extractPlaceholders(body);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">{isEdit ? "تعديل القالب" : "قالب جديد"}</h3>
        <Button variant="ghost" size="icon" aria-label="إغلاق النموذج" onClick={onCancel} disabled={saving}>
          <X className="text-muted-foreground" />
        </Button>
      </div>

      <Field label="اسم القالب" Icon={Type} htmlFor="tpl-title">
        <input
          id="tpl-title"
          value={title}
          maxLength={MAX_TEMPLATE_TITLE}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          placeholder="مثال: تذكير فاتورة شهرية"
          className={inputClass}
          disabled={saving}
        />
      </Field>

      <Field label="نص الرسالة" Icon={MessageSquare} hint={`${MAX_TEMPLATE_BODY - body.length} حرف متبقٍّ`} htmlFor="tpl-body">
        <textarea
          id="tpl-body"
          value={body}
          maxLength={MAX_TEMPLATE_BODY}
          rows={5}
          onChange={(e) => {
            setBody(e.target.value);
            setError(null);
          }}
          placeholder="مرحباً {{name}}، فاتورتك بقيمة {{amount}} ريال. شكراً لك."
          className={`${inputClass} min-h-32 resize-y leading-relaxed`}
          disabled={saving}
        />
      </Field>

      {placeholders.length > 0 ? <PlaceholderChips names={placeholders} label="المتغيرات:" /> : null}

      {error ? <ErrorText>{error}</ErrorText> : null}

      <Button size="xl" className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : isEdit ? "حفظ التعديلات" : "حفظ القالب"}
      </Button>
    </div>
  );
}

export function PlaceholderChips({ names, label }: { names: string[]; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label ? <span className="text-xs font-semibold text-muted-foreground">{label}</span> : null}
      {names.map((n) => (
        <span key={n} dir="ltr" className="rounded-full border border-primary-border bg-primary-soft px-2.5 py-0.5 font-mono text-xs text-primary">
          {`{{${n}}}`}
        </span>
      ))}
    </div>
  );
}
