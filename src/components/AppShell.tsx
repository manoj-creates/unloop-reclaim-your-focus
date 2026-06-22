import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BarChart3, Map, LayoutGrid, User as UserIcon } from "lucide-react";
import type { ReactNode } from "react";

const tabs = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/journey", label: "Journey", icon: Map },
  { to: "/widgets", label: "Widgets", icon: LayoutGrid },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-background flex justify-center">
      <div
        className="w-full max-w-[440px] min-h-dvh bg-surface relative"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 6.5rem)",
        }}
      >
        {children}
        <nav
          aria-label="Primary"
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] z-40 pointer-events-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-3 mb-3 rounded-3xl bg-card/95 backdrop-blur-xl border border-border shadow-card px-2 py-2 flex items-center justify-between pointer-events-auto">
            {tabs.map((t) => {
              const active = t.to === "/app" ? pathname === "/app" : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  aria-label={t.label}
                  aria-current={active ? "page" : undefined}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <div className={`flex items-center justify-center transition-all ${active ? "text-primary scale-110" : "text-muted-foreground"}`}>
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
                  </div>
                  <span className={`text-[10px] font-medium tracking-wide ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {t.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function StatusBar() {
  return null;
}

export function ScreenHeader({ title, right, back }: { title?: string; right?: ReactNode; back?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="w-9">
        {back && (
          <Link
            to={back}
            aria-label="Go back"
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">‹</span>
          </Link>
        )}
      </div>
      {title && <h1 className="text-base font-semibold">{title}</h1>}
      <div className="w-9 flex justify-end">{right}</div>
    </div>
  );
}

