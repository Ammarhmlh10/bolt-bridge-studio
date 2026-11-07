import { Link, useLocation } from "@tanstack/react-router";
import { Bird, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "الرئيسية" },
  { to: "/pricing", label: "الأسعار" },
  { to: "/download", label: "حمّل التطبيق" },
  { to: "/contact", label: "تواصل معنا" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="هدهد الفواتير - الرئيسية">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-primary-foreground">
        <Bird className="size-5" />
      </span>
      <span className="text-lg font-bold text-foreground">هدهد الفواتير</span>
    </Link>
  );
}

function SiteHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="التنقل الرئيسي">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                pathname === item.to ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden h-9 rounded-xl px-4 md:inline-flex">
            <Link to="/auth">الدخول للتطبيق</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open ? (
        <nav className="border-t bg-background px-4 pb-4 pt-2 md:hidden" aria-label="قائمة الجوال">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-lg px-3 py-3 text-[15px] font-semibold",
                pathname === item.to ? "bg-primary-soft text-primary" : "text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Button asChild className="mt-2 h-11 w-full rounded-xl">
            <Link to="/auth">الدخول للتطبيق</Link>
          </Button>
        </nav>
      ) : null}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            حوّل ملفات الفواتير وقوائم العملاء إلى رسائل جاهزة، وأرسلها من جوالك عبر بوابة الاتصالات التي تختارها.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">الموقع</p>
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="block text-sm text-muted-foreground hover:text-primary">
              {item.label}
            </Link>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">الحساب</p>
          <Link to="/auth" className="block text-sm text-muted-foreground hover:text-primary">
            تسجيل الدخول
          </Link>
          <Link to="/auth" className="block text-sm text-muted-foreground hover:text-primary">
            إنشاء حساب جديد
          </Link>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} هدهد الفواتير. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <section className="bg-hero-glow">
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-14 text-center md:pt-20">
        <p className="text-sm font-bold text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-foreground md:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">{subtitle}</p>
      </div>
    </section>
  );
}
