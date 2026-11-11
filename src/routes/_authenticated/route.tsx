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
  { to: "/home", label: "القائمة الرئيسية", Icon: House },
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
      aria-current={active ? "page" : undefined}
      aria-label={tab.label}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <tab.Icon className="size-[22px] shrink-0" strokeWidth={2} />
      <span className="w-full truncate text-center">{tab.label}</span>
    </Link>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card shadow-nav" aria-label="التنقل في التطبيق">
      <div className="mx-auto flex max-w-xl items-end gap-1 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        {TABS_START.map((t) => (
          <NavTab key={t.to} tab={t} active={isActive(t.to)} />
        ))}
        <div className="flex flex-1 justify-center">
          <Link
            to="/send"
            aria-label="إرسال من ملف"
            className="-mt-9 flex size-[62px] items-center justify-center rounded-full bg-brand-gradient text-primary-foreground shadow-fab ring-[5px] ring-card transition-transform active:scale-95"
          >
            <Send className="size-[26px]" strokeWidth={2} />
          </Link>
        </div>
        {TABS_END.map((t) => (
          <NavTab key={t.to} tab={t} active={isActive(t.to)} />
        ))}
      </div>
    </nav>
  );
}
