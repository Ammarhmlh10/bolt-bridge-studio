import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Trash2, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDelete, ErrorText, errorMessage } from "@/components/app/ui-bits";
import { deleteGatewayConnection, testGatewayConnection, type GatewayConnection } from "@/lib/gateway.functions";

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "done"; reachable: boolean; code: number | null }
  | { status: "error"; message: string };

function hostOf(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
}

export function ConnectionCard({
  connection,
  disabled,
  onEdit,
  onDeleted,
}: {
  connection: GatewayConnection;
  disabled: boolean;
  onEdit: () => void;
  onDeleted: (id: string) => void;
}) {
  const testFn = useServerFn(testGatewayConnection);
  const deleteFn = useServerFn(deleteGatewayConnection);
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const runTest = async () => {
    setTest({ status: "testing" });
    try {
      const r = await testFn({ data: { id: connection.id } });
      setTest({ status: "done", reachable: r.reachable, code: r.status });
    } catch (err) {
      setTest({ status: "error", message: errorMessage(err, "تعذر إجراء الاختبار.") });
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteFn({ data: { id: connection.id } });
      onDeleted(connection.id);
    } catch (err) {
      setDeleteError(errorMessage(err, "تعذر حذف الخدمة. حاول مرة أخرى."));
      setDeleting(false);
    }
  };

  const testing = test.status === "testing";
  const actionsDisabled = disabled || testing || deleting;

  return (
    <div className="space-y-3 rounded-2xl border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{connection.sender_name}</p>
          <p dir="ltr" className="truncate text-end text-sm text-muted-foreground">
            {hostOf(connection.endpoint_url)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="iconSoft" size="iconLg" aria-label="اختبار الاتصال بالخدمة" onClick={runTest} disabled={actionsDisabled}>
            {testing ? <Loader2 className="animate-spin" /> : <Wifi />}
          </Button>
          <Button variant="iconSoft" size="iconLg" aria-label="تعديل الخدمة" onClick={onEdit} disabled={actionsDisabled}>
            <Pencil />
          </Button>
          <Button variant="iconDanger" size="iconLg" aria-label="حذف الخدمة" onClick={() => setConfirming(true)} disabled={actionsDisabled}>
            <Trash2 />
          </Button>
        </div>
      </div>

      {test.status === "done" && test.reachable ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <Wifi className="size-4" />
          العنوان يستجيب بشكل صحيح{test.code ? ` (رمز ${test.code})` : ""}
        </p>
      ) : null}
      {test.status === "done" && !test.reachable ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <WifiOff className="size-4" />
          تعذر الوصول إلى العنوان. تأكد من صحته ومن عمل الخدمة.
        </p>
      ) : null}
      {test.status === "error" ? <ErrorText>{test.message}</ErrorText> : null}

      {confirming ? (
        <ConfirmDelete
          text="هل تريد حذف هذه الخدمة نهائياً؟"
          busy={deleting}
          error={deleteError}
          onCancel={() => setConfirming(false)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
