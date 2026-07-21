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
import { SEDES, type Sede } from "@/datos/sedes";
import { listarEspecialidades, medicosPorEspecialidadYSede } from "@/logica/medicos";
import { crearCita } from "@/logica/citas";
import { obtenerSesion } from "@/logica/autenticacion";
import { slotsDisponibles, fechasDisponibles } from "@/logica/disponibilidad";
import { toast } from "sonner";
import { useNavigate, useRouterState } from "@tanstack/react-router";

export function Boton_Urgente() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const especialidades = listarEspecialidades();
  const [abierto, setAbierto] = useState(false);
  const [especialidad, setEspecialidad] = useState(especialidades[0] ?? "");
  const [sede, setSede] = useState<Sede>(SEDES[0]);

  // Ocultar en rutas médicas y de administración
  if (
    pathname.startsWith("/panel_medico") ||
    pathname.startsWith("/disponibilidad_medico") ||
    pathname.startsWith("/panel_admin") ||
    pathname.startsWith("/reportes")
  ) {
    return null;
  }


  function confirmar() {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== "Paciente") {
      toast.error("Debes iniciar sesión como paciente.");
      setAbierto(false);
      navigate({ to: "/inicio_sesion" });
      return;
    }

    const medicos = medicosPorEspecialidadYSede(especialidad, sede);
    const doctor = medicos[0];
    if (!doctor) {
      toast.error("No hay médicos de esta especialidad en la sede seleccionada.");
      return;
    }

    // Buscar primer slot disponible
    const fechas = fechasDisponibles(doctor.id, 14);
    let fechaElegida = "";
    let horaElegida = "";
    for (const f of fechas) {
      const slots = slotsDisponibles(doctor.id, f);
      if (slots.length > 0) {
        fechaElegida = f;
        horaElegida = slots[0];
        break;
      }
    }
    if (!fechaElegida) {
      toast.error("No hay horarios disponibles en los próximos 14 días.");
      return;
    }

    const cita = crearCita({
      pacienteCorreo: sesion.correo,
      pacienteNombre: sesion.nombre,
      doctorId: doctor.id,
      doctorNombre: doctor.nombre,
      especialidad,
      sede,
      fecha: fechaElegida,
      hora: horaElegida,
      esUrgente: true,
      observaciones: "Cita urgente solicitada desde el botón rápido.",
    });

    setAbierto(false);
    toast.success("Cita urgente agendada", {
      description: `${cita.especialidad} · ${cita.fecha} a las ${cita.hora}. Código ${cita.codigo}.`,
    });
    navigate({ to: "/historial_citas" });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
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
            Reservamos el primer cupo disponible en la sede elegida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sede
            </label>
            <select
              value={sede}
              onChange={(e) => setSede(e.target.value as Sede)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              {SEDES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Especialidad
            </label>
            <select
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              {especialidades.map((s) => (
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
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button variant="urgent" onClick={confirmar}>
            <BellRing className="size-4" />
            Confirmar urgencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
