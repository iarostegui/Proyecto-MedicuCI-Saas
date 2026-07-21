import type { ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  History,
  HeartPulse,
  LogOut,
  Stethoscope,
  Settings2,
  Shield,
  BarChart3,
} from "lucide-react";
import { Boton_Urgente } from "@/components/Boton_Urgente";
import { Campana_Notificaciones } from "@/components/Campana_Notificaciones";
import { useSesion } from "@/hooks/useSesion";
import { cn } from "@/lib/utils";

const navPaciente = [
  { to: "/panel_principal", label: "Panel", icon: CalendarDays },
  { to: "/historial_citas", label: "Historial", icon: History },
] as const;
const navMedico = [
  { to: "/panel_medico", label: "Citas", icon: Stethoscope },
  { to: "/disponibilidad_medico", label: "Disponibilidad", icon: Settings2 },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
] as const;
const navAdmin = [
  { to: "/panel_admin", label: "Admin", icon: Shield },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
] as const;

export function Cascara_App({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { rol, cerrarSesion } = useSesion();
  const navegacion =
    rol === "Medico" ? navMedico : rol === "Admin" ? navAdmin : navPaciente;
  const inicioLink =
    rol === "Medico"
      ? "/panel_medico"
      : rol === "Admin"
        ? "/panel_admin"
        : "/panel_principal";

  function handleCerrarSesion() {
    cerrarSesion();
    navigate({ to: "/inicio_sesion" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link to={inicioLink} className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
              <HeartPulse className="size-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">Medicu CI</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navegacion.map((item) => {
              const activo = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    activo
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

          <div className="flex items-center gap-1">
            <Campana_Notificaciones />
            <button
              onClick={handleCerrarSesion}
              aria-label="Cerrar sesión"
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-32 pt-6 sm:pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around">
          {navegacion.map((item) => {
            const activo = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  activo ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Boton_Urgente />
    </div>
  );
}
