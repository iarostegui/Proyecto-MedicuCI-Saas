import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/appointments";

const styles: Record<AppointmentStatus, string> = {
  confirmada: "bg-success/12 text-success ring-success/20",
  pendiente: "bg-warning/15 text-warning-foreground ring-warning/30",
  completada: "bg-muted text-muted-foreground ring-border",
  cancelada: "bg-destructive/10 text-destructive ring-destructive/20",
  urgente: "bg-urgent/12 text-urgent ring-urgent/25",
};

const labels: Record<AppointmentStatus, string> = {
  confirmada: "Confirmada",
  pendiente: "Pendiente",
  completada: "Completada",
  cancelada: "Cancelada",
  urgente: "Urgente",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        styles[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}
