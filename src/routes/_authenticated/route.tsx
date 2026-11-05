import { Link, Outlet, createFileRoute, redirect, useLocation } from "@tanstack/react-router";
import { FileText, House, Megaphone, Send, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", replace: true });
    return { user: data.user };
  },
  component: AppShell,
});

type Tab = { to: "/home" | "/campaigns" | "/templates" | "/settings"; label: string; Icon: LucideIcon };

const TABS_START: Tab[] = [
  { to: "/home", label: "الرئيسية", Icon: House },
  { to: "/campaigns", label: "الحملات", Icon: Megaphone },
];
const TABS_END: Tab[] = [
  { to: "/templates", label: "القوالب", Icon: FileText },
  { to: "/settings", label: "الإعدادات", Icon: Settings },
];

function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-xl px-4 pb-32 pt-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

function NavTab({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      to={tab.to}
      role="tab"
      aria-selected={active}
      aria-label={tab.label}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-1 text-xs font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className={cn("flex h-8 w-12 items-center justify-center rounded-full", active && "bg-primary-soft")}>
        <tab.Icon className="size-[22px]" strokeWidth={2} />
      </span>
      <span className="truncate">{tab.label}</span>
    </Link>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className="mx-auto max-w-xl px-3">
        <div role="tablist" className="flex items-end rounded-[24px] border bg-card px-2 pb-2 pt-2 shadow-nav">
          {TABS_START.map((t) => (
            <NavTab key={t.to} tab={t} active={pathname === t.to} />
          ))}
          <div className="flex flex-1 justify-center">
            <Link
              to="/campaigns"
              aria-label="زر الإرسال الرئيسي"
              className="-mt-8 flex size-[60px] items-center justify-center rounded-full bg-brand-gradient text-primary-foreground shadow-fab ring-4 ring-background transition-transform active:scale-95"
            >
              <Send className="size-[26px]" strokeWidth={2} />
            </Link>
          </div>
          {TABS_END.map((t) => (
            <NavTab key={t.to} tab={t} active={pathname === t.to} />
          ))}
        </div>
      </div>
    </nav>
  );
}
