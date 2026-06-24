import { useState } from "react";
import { BellRing, Phone, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { specialties } from "@/lib/appointments";
import { toast } from "sonner";

export function UrgentFab() {
  const [open, setOpen] = useState(false);
  const [specialty, setSpecialty] = useState(specialties[0]);

  function confirm() {
    setOpen(false);
    toast.success("Cita urgente solicitada", {
      description: `${specialty} · te contactaremos en breve para confirmar la hora.`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Agendar cita urgente"
          className="pulse-ring fixed bottom-24 right-5 z-40 inline-flex h-14 items-center gap-3 rounded-full bg-urgent pl-3 pr-5 text-urgent-foreground shadow-[var(--shadow-urgent)] transition-transform duration-200 hover:scale-[1.04] active:scale-95 sm:bottom-8 sm:right-8"
        >
          <span className="relative grid size-9 place-items-center rounded-full bg-white/20">
            <BellRing className="size-5" />
          </span>
          <span className="text-sm font-bold tracking-tight">Agendar cita urgente</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 inline-flex size-12 items-center justify-center rounded-2xl bg-urgent/12 text-urgent">
            <BellRing className="size-6" />
          </div>
          <DialogTitle className="text-xl">Solicitar atención urgente</DialogTitle>
          <DialogDescription>
            Reservamos el primer cupo disponible y te avisamos de inmediato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Especialidad
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              {specialties.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-secondary/60 p-3 text-sm text-secondary-foreground">
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary" />
              Urgencias · Planta baja, acceso principal
            </p>
            <p className="mt-1.5 flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-primary" />
              Línea directa 24/7: 800 123 4567
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="urgent" onClick={confirm}>
            <BellRing className="size-4" />
            Confirmar urgencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
