import type { LucideIcon } from "lucide-react";
import { Loader2, RotateCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, brand }: { title: string; subtitle: string; brand?: boolean }) {
  return (
    <header className="space-y-1 px-1">
      {brand ? <p className="text-sm font-semibold text-primary">هدهد الفواتير</p> : null}
      <h1 className="text-[28px] font-bold leading-tight text-foreground">{title}</h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-4 rounded-[20px] border bg-card p-4 shadow-card", className)}>{children}</section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-bold text-foreground">{children}</h2>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-6 animate-spin text-primary", className)} aria-label="جاري التحميل" />;
}

export function LoadingCard() {
  return (
    <Card>
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    </Card>
  );
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-destructive">{message}</p>
      <Button variant="soft" onClick={onRetry} className="h-10 rounded-xl">
        <RotateCw />
        إعادة المحاولة
      </Button>
    </Card>
  );
}

export function EmptyState({ Icon, title, description }: { Icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] border bg-card px-6 py-10 text-center shadow-card">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary-soft">
        <Icon className="size-8 text-primary" strokeWidth={2} />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export function Field({
  label,
  Icon,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  Icon: LucideIcon;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-muted-foreground" />
          {label}
        </label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-input bg-background px-3.5 py-3 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold text-destructive">{children}</p>;
}

export function ConfirmDelete({
  text,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  text: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive-soft p-3">
      <p className="text-sm font-semibold text-foreground">{text}</p>
      <div className="flex gap-2">
        <Button variant="outline" className="h-10 flex-1 rounded-xl" onClick={onCancel} disabled={busy}>
          إلغاء
        </Button>
        <Button variant="destructive" className="h-10 flex-1 rounded-xl" onClick={onConfirm} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : "حذف"}
        </Button>
      </div>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message && !err.message.startsWith("Unauthorized")) {
    // Postgres / network messages are English; show the friendly Arabic fallback instead.
    return /[\u0600-\u06FF]/.test(err.message) ? err.message : fallback;
  }
  return fallback;
}
