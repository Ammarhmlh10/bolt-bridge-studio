import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Layers, Loader2, Minus, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorText, Field, errorMessage } from "@/components/app/ui-bits";
import { BATCH_SIZE_RANGE, RETRIES_RANGE } from "@/lib/hodhod-rules";
import { saveSendingPreferences, type GatewaySettings } from "@/lib/gateway.functions";

function Stepper({
  value,
  unit,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  const canDec = !disabled && value - step >= min;
  const canInc = !disabled && value + step <= max;
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="iconSoft" size="iconLg" className="size-11" aria-label="تقليل" disabled={!canDec} onClick={() => onChange(value - step)}>
        <Minus />
      </Button>
      <div className="flex flex-1 items-baseline justify-center gap-1.5">
        <span className="text-[22px] font-bold">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <Button variant="iconSoft" size="iconLg" className="size-11" aria-label="زيادة" disabled={!canInc} onClick={() => onChange(value + step)}>
        <Plus />
      </Button>
    </div>
  );
}

export function SendingPreferencesForm({
  initial,
  onSaved,
}: {
  initial: GatewaySettings;
  onSaved: (s: GatewaySettings) => void;
}) {
  const saveFn = useServerFn(saveSendingPreferences);
  const [batchSize, setBatchSize] = useState(initial.batch_size);
  const [maxRetries, setMaxRetries] = useState(initial.max_retries);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const changed = batchSize !== initial.batch_size || maxRetries !== initial.max_retries;

  const update = (setter: (v: number) => void) => (v: number) => {
    setter(v);
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await saveFn({ data: { batch_size: batchSize, max_retries: maxRetries } });
      setSaved(true);
      onSaved(result);
    } catch (err) {
      setError(errorMessage(err, "تعذر حفظ إعدادات الإرسال. حاول مرة أخرى."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Field label="عدد الرسائل في كل دفعة" Icon={Layers} hint="بين 10 و 100">
        <Stepper value={batchSize} unit="رسالة" {...BATCH_SIZE_RANGE} disabled={saving} onChange={update(setBatchSize)} />
      </Field>
      <Field label="محاولات إعادة الإرسال عند الفشل" Icon={RotateCcw} hint="بين 0 و 5">
        <Stepper value={maxRetries} unit="محاولة" {...RETRIES_RANGE} disabled={saving} onChange={update(setMaxRetries)} />
      </Field>

      {error ? <ErrorText>{error}</ErrorText> : null}
      {saved ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="size-[18px]" />
          تم حفظ إعدادات الإرسال
        </p>
      ) : null}

      <div className="flex gap-2">
        {changed ? (
          <Button
            variant="outline"
            size="xl"
            onClick={() => {
              setBatchSize(initial.batch_size);
              setMaxRetries(initial.max_retries);
              setError(null);
              setSaved(false);
            }}
            disabled={saving}
          >
            تراجع
          </Button>
        ) : null}
        <Button size="xl" className="flex-1" onClick={handleSave} disabled={!changed || saving}>
          {saving ? <Loader2 className="animate-spin" /> : "حفظ إعدادات الإرسال"}
        </Button>
      </div>
    </div>
  );
}
