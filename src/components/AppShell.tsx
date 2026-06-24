import type { ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { CalendarDays, History, HeartPulse, LogOut } from "lucide-react";
import { UrgentFab } from "@/components/UrgentFab";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/panel", label: "Panel", icon: CalendarDays },
  { to: "/historial", label: "Historial", icon: History },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link to="/panel" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
              <HeartPulse className="size-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">Medicu CI</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {nav.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => navigate({ to: "/" })}
            aria-label="Cerrar sesión"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-[18px]" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-32 pt-6 sm:pb-24">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <UrgentFab />
    </div>
  );
}
