import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Link2, Loader2, Tag, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorText, Field, errorMessage, inputClass } from "@/components/app/ui-bits";
import { MAX_SENDER_LENGTH, normalizeEndpoint } from "@/lib/hodhod-rules";
import { createGatewayConnection, updateGatewayConnection, type GatewayConnection } from "@/lib/gateway.functions";

function validate(endpoint: string, sender: string, apiKey: string, isEdit: boolean): string | null {
  if (!normalizeEndpoint(endpoint)) return "أدخل عنوان الخدمة كاملاً، ويبدأ بـ https://";
  const s = sender.trim();
  if (s.length === 0 || s.length > MAX_SENDER_LENGTH) return `اسم المرسل يجب أن يكون بين 1 و ${MAX_SENDER_LENGTH} حرفاً`;
  if (!isEdit && apiKey.trim().length === 0) return "أدخل مفتاح الربط";
  return null;
}

export function ConnectionForm({
  connection,
  onSaved,
  onCancel,
}: {
  connection: GatewayConnection | null;
  onSaved: (c: GatewayConnection) => void;
  onCancel: () => void;
}) {
  const isEdit = connection !== null;
  const createFn = useServerFn(createGatewayConnection);
  const updateFn = useServerFn(updateGatewayConnection);
  const [endpoint, setEndpoint] = useState(connection?.endpoint_url ?? "");
  const [sender, setSender] = useState(connection?.sender_name ?? "");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const v = validate(endpoint, sender, apiKey, isEdit);
    if (v) return setError(v);
    setSaving(true);
    setError(null);
    try {
      const input = { endpoint_url: endpoint.trim(), sender_name: sender.trim(), api_key: apiKey.trim() };
      const saved = connection
        ? await updateFn({ data: { id: connection.id, ...input } })
        : await createFn({ data: input });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err, "تعذر حفظ الخدمة. حاول مرة أخرى."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-primary-border bg-primary-soft/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">{isEdit ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</h3>
        <Button variant="ghost" size="icon" aria-label="إغلاق النموذج" onClick={onCancel} disabled={saving}>
          <X className="text-muted-foreground" />
        </Button>
      </div>

      <Field label="عنوان خدمة الرسائل" Icon={Link2} htmlFor="conn-endpoint">
        <input
          id="conn-endpoint"
          type="url"
          value={endpoint}
          onChange={(e) => {
            setEndpoint(e.target.value);
            setError(null);
          }}
          placeholder="https://api.example.com/send"
          autoCapitalize="none"
          autoCorrect="off"
          className={`${inputClass} ltr-field`}
          disabled={saving}
        />
      </Field>

      <Field
        label="مفتاح الربط"
        Icon={KeyRound}
        hint={isEdit ? "اتركه فارغاً للإبقاء على المفتاح الحالي" : undefined}
        htmlFor="conn-key"
      >
        <input
          id="conn-key"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setError(null);
          }}
          placeholder={isEdit ? "محفوظ، اكتب مفتاحاً جديداً للتغيير" : "أدخل مفتاح الربط"}
          className={`${inputClass} ltr-field`}
          disabled={saving}
        />
      </Field>

      <Field label="اسم المرسل" Icon={Tag} hint={`حتى ${MAX_SENDER_LENGTH} حرفاً`} htmlFor="conn-sender">
        <input
          id="conn-sender"
          value={sender}
          maxLength={MAX_SENDER_LENGTH}
          onChange={(e) => {
            setSender(e.target.value);
            setError(null);
          }}
          placeholder="مثال: الشركة"
          className={inputClass}
          disabled={saving}
        />
      </Field>

      {error ? <ErrorText>{error}</ErrorText> : null}

      <Button size="xl" className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : isEdit ? "حفظ التعديلات" : "حفظ الخدمة"}
      </Button>
    </div>
  );
}
