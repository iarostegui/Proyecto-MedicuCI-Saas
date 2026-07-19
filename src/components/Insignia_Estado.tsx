import { cn } from "@/lib/utils";
import type { EstadoCita } from "@/logica/citas";

const estilos: Record<EstadoCita, string> = {
  Programada: "bg-success/12 text-success ring-success/20",
  Reprogramada: "bg-warning/15 text-warning-foreground ring-warning/30",
  Atendida: "bg-muted text-muted-foreground ring-border",
  Cancelada: "bg-destructive/10 text-destructive ring-destructive/20",
};

export function Insignia_Estado({ estado }: { estado: EstadoCita }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        estilos[estado],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {estado}
    </span>
  );
}

export function Insignia_Urgente() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-urgent/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-urgent ring-1 ring-inset ring-urgent/25">
      <span className="size-1.5 rounded-full bg-current" />
      Urgente
    </span>
  );
}
