import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, ConfirmDelete, errorMessage } from "@/components/app/ui-bits";
import { PlaceholderChips } from "@/components/app/TemplateForm";
import { extractPlaceholders } from "@/lib/hodhod-rules";
import { deleteTemplate, formatArabicDate, type MessageTemplate } from "@/lib/templates";

export function TemplateCard({
  template,
  disabled,
  onEdit,
  onDeleted,
}: {
  template: MessageTemplate;
  disabled: boolean;
  onEdit: () => void;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const placeholders = extractPlaceholders(template.body);
  const isLong = template.body.length > 120;
  const shown = expanded || !isLong ? template.body : template.body.slice(0, 120) + "…";

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
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 className="truncate text-base font-bold">{template.title}</h3>
          <p className="text-xs text-muted-foreground">{formatArabicDate(template.updated_at)}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="iconSoft" size="iconLg" aria-label="تعديل القالب" onClick={onEdit} disabled={disabled}>
            <Pencil />
          </Button>
          <Button variant="iconDanger" size="iconLg" aria-label="حذف القالب" onClick={() => setConfirming(true)} disabled={disabled}>
            <Trash2 />
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => isLong && setExpanded((e) => !e)}
        className="block w-full whitespace-pre-wrap rounded-xl bg-muted p-3 text-start text-sm leading-relaxed text-foreground"
      >
        {shown}
      </button>

      {placeholders.length > 0 ? <PlaceholderChips names={placeholders} /> : null}

      {confirming ? (
        <ConfirmDelete
          text="هل تريد حذف هذا القالب نهائياً؟"
          busy={deleting}
          error={deleteError}
          onCancel={() => setConfirming(false)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </Card>
  );
}
