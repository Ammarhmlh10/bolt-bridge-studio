import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleCheck, CircleDashed, Loader2, LogOut, Plus } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, ErrorCard, LoadingCard, PageHeader, SectionTitle } from "@/components/app/ui-bits";
import { ConnectionCard } from "@/components/app/ConnectionCard";
import { ConnectionForm } from "@/components/app/ConnectionForm";
import { SendingPreferencesForm } from "@/components/app/SendingPreferencesForm";
import type { GatewayConnection, GatewaySettings } from "@/lib/gateway.functions";
import { gatewayQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

const SUBTITLE = "اربط التطبيق بخدمة إرسال الرسائل وحدد طريقة الإرسال";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — هدهد الفواتير" },
      { name: "description", content: "اربط خدمات إرسال الرسائل وحدد حجم الدفعات ومحاولات الإعادة." },
      { property: "og:title", content: "الإعدادات — هدهد الفواتير" },
      { property: "og:description", content: "إدارة الخدمات المرتبطة وإعدادات الإرسال." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(gatewayQuery),
  pendingComponent: () => (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" subtitle={SUBTITLE} />
      <LoadingCard />
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" subtitle={SUBTITLE} />
      <ErrorCard message="تعذر تحميل الإعدادات." onRetry={reset} />
    </div>
  ),
  component: SettingsPage,
});

type FormState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; connection: GatewayConnection };

function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: settings } = useSuspenseQuery(gatewayQuery);
  const [form, setForm] = useState<FormState>({ mode: "closed" });
  const [signingOut, setSigningOut] = useState(false);

  const setSettings = (fn: (cur: GatewaySettings) => GatewaySettings) =>
    queryClient.setQueryData(gatewayQuery.queryKey, (cur: GatewaySettings | undefined) => (cur ? fn(cur) : cur));

  const hasConnections = settings.connections.length > 0;

  const handleSaved = (saved: GatewayConnection) => {
    setSettings((cur) => {
      const exists = cur.connections.some((c) => c.id === saved.id);
      return {
        ...cur,
        connections: exists ? cur.connections.map((c) => (c.id === saved.id ? saved : c)) : [...cur.connections, saved],
      };
    });
    setForm({ mode: "closed" });
  };

  const handleDeleted = (id: string) => {
    setSettings((cur) => ({ ...cur, connections: cur.connections.filter((c) => c.id !== id) }));
    setForm((cur) => (cur.mode === "edit" && cur.connection.id === id ? { mode: "closed" } : cur));
  };

  const signOut = async () => {
    setSigningOut(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" subtitle={SUBTITLE} />

      <Card>
        <SectionTitle>الخدمات المرتبطة</SectionTitle>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
            hasConnections ? "bg-success-soft" : "bg-warning-soft",
          )}
        >
          {hasConnections ? (
            <CircleCheck className="size-[18px] text-success" />
          ) : (
            <CircleDashed className="size-[18px] text-warning" />
          )}
          {hasConnections
            ? `${settings.connections.length} ${settings.connections.length === 1 ? "خدمة مرتبطة" : "خدمات مرتبطة"}`
            : "لا توجد خدمات مرتبطة بعد"}
        </div>

        {settings.connections.map((c) => (
          <ConnectionCard
            key={c.id}
            connection={c}
            disabled={form.mode !== "closed"}
            onEdit={() => setForm({ mode: "edit", connection: c })}
            onDeleted={handleDeleted}
          />
        ))}

        {form.mode === "closed" ? (
          <Button variant="dashed" size="tall" className="w-full" onClick={() => setForm({ mode: "create" })}>
            <Plus />
            إضافة خدمة جديدة
          </Button>
        ) : (
          <ConnectionForm
            key={form.mode === "edit" ? form.connection.id : "create"}
            connection={form.mode === "edit" ? form.connection : null}
            onSaved={handleSaved}
            onCancel={() => setForm({ mode: "closed" })}
          />
        )}
      </Card>

      <Card>
        <SectionTitle>إعدادات الإرسال</SectionTitle>
        <SendingPreferencesForm
          initial={settings}
          onSaved={(s) => queryClient.setQueryData(gatewayQuery.queryKey, s)}
        />
      </Card>

      <Button variant="danger" size="xl" className="w-full" onClick={signOut} disabled={signingOut}>
        {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
        تسجيل الخروج
      </Button>
    </div>
  );
}
