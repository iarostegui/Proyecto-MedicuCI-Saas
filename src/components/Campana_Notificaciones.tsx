import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useSesion } from "@/hooks/useSesion";
import type { Notificacion } from "@/servicios/servicio_notificaciones";
import {
  marcarNotificacionesLeidas,
  notificacionesDatos,
  type NotificacionVista,
} from "@/servicios/fachada_datos";
import { cn } from "@/lib/utils";

const ESTILO_TIPO: Record<Notificacion["tipo"], string> = {
  recordatorio: "bg-primary-soft text-primary",
  urgente: "bg-urgent/15 text-urgent",
  cancelada: "bg-destructive/10 text-destructive",
  reprogramada: "bg-warning/15 text-warning-foreground",
  atendida: "bg-success/15 text-success",
};

export function Campana_Notificaciones() {
  const { usuario, rol } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Refresca cada 30s (recordatorios cambian con el tiempo).
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    if (abierto) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [abierto]);

  // ===== SOLID - DIP =====
  // La campana pide los avisos a la fachada (MySQL o local), nunca al almacén.
  const [items, setItems] = useState<NotificacionVista[]>([]);

  const cargar = useCallback(async () => {
    if (!usuario || !rol) {
      setItems([]);
      return;
    }
    setItems(await notificacionesDatos(usuario.correo, rol));
  }, [usuario, rol]);

  useEffect(() => {
    void cargar();
  }, [cargar, tick, abierto]);

  const noLeidas = items.filter((n) => !n.leida).length;

  if (!usuario) return null;

  async function marcarTodas() {
    if (!usuario) return;
    await marcarNotificacionesLeidas(
      usuario.correo,
      items.map((n) => n.id),
    );
    setTick((n) => n + 1);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Notificaciones"
        className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Bell className="size-[18px]" />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-urgent px-1 text-[10px] font-bold text-urgent-foreground">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-40 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-border/70 bg-card p-3 shadow-[var(--shadow-card)]">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">Notificaciones</h3>
            {items.length > 0 && (
              <button
                onClick={() => void marcarTodas()}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Check className="size-3.5" /> Marcar leídas
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No tienes notificaciones.
            </p>
          ) : (
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {items.slice(0, 20).map((n) => {
                const leida = n.leida;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "rounded-xl border p-3 text-sm transition-colors",
                      leida
                        ? "border-transparent bg-secondary/50"
                        : "border-primary/25 bg-primary-soft/50",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          ESTILO_TIPO[n.tipo],
                        )}
                      >
                        {n.tipo}
                      </span>
                      <p className="font-semibold text-foreground">{n.titulo}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{n.detalle}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
