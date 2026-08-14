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
import { listarEspecialidades } from "@/servicios/servicio_medicos";
import { obtenerSesion } from "@/servicios/servicio_sesion";
import { slotsDisponibles, fechasDisponibles } from "@/servicios/servicio_agenda";
import { toast } from "sonner";
import { useNavigate, useRouterState } from "@tanstack/react-router";

// 💡 DIP - Importamos desde la fachada para conectar con Aiven MySQL
import {
  actorActual,
  crearCitaDatos,
  sedesDatos,
  especialidadesDeSedeDatos,
  medicosDatos,
} from "@/servicios/fachada_datos";

export function Boton_Urgente() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const especialidades = listarEspecialidades();
  const [abierto, setAbierto] = useState(false);
  const [especialidad, setEspecialidad] = useState(especialidades[0] ?? "");
  const [sede, setSede] = useState<Sede>(SEDES[0]);
  const [guardando, setGuardando] = useState(false);

  // Ocultar en rutas médicas y de administración
  if (
    pathname.startsWith("/panel_medico") ||
    pathname.startsWith("/disponibilidad_medico") ||
    pathname.startsWith("/panel_admin") ||
    pathname.startsWith("/reportes")
  ) {
    return null;
  }

  async function confirmar() {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== "Paciente") {
      toast.error("Debes iniciar sesión como paciente.");
      setAbierto(false);
      navigate({ to: "/inicio_sesion" });
      return;
    }

    const actor = actorActual();
    if (!actor) {
      toast.error("Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }

    setGuardando(true);

    try {
      // 1. Obtener sedes actualizadas
      const sedesLista = await sedesDatos();
      const sedeObj = sedesLista.find((s) => s.nombre === sede);
      if (!sedeObj) {
        toast.error("Sede no encontrada.");
        setGuardando(false);
        return;
      }

      // 2. Obtener especialidades asociadas a esa sede
      const especsLista = await especialidadesDeSedeDatos(sedeObj);
      const especObj = especsLista.find((e) => e.nombre === especialidad);
      if (!especObj) {
        toast.error("La sede seleccionada no cuenta con esa especialidad disponible.");
        setGuardando(false);
        return;
      }

      // 3. Obtener médicos disponibles
      const medicosLista = await medicosDatos(sedeObj, especObj);
      const doctor = medicosLista[0];
      if (!doctor) {
        toast.error("No hay médicos de esta especialidad en la sede seleccionada.");
        setGuardando(false);
        return;
      }

      // 4. Buscar primer slot disponible
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
        setGuardando(false);
        return;
      }

      // 5. Guardar en MySQL mediante la API
      const r = await crearCitaDatos(actor, sesion.nombre, {
        doctorId: doctor.id,
        doctorNombre: doctor.nombre,
        especialidad: especialidad,
        sede: sede,
        fecha: fechaElegida,
        hora: horaElegida,
        esUrgente: true,
        observaciones: "Cita urgente solicitada desde el botón rápido.",
        ...(doctor.idNumerico ? { idMedico: doctor.idNumerico } : {}),
        ...(sedeObj.id ? { idSede: sedeObj.id } : {}),
        ...(especObj.id ? { idEspecialidad: especObj.id } : {}),
      });

      if (!r.ok || !r.datos) {
        toast.error(r.error ?? "No se pudo agendar la cita urgente.");
        setGuardando(false);
        return;
      }

      setAbierto(false);
      toast.success("Cita urgente agendada", {
        description: `${r.datos.especialidad} · ${r.datos.fecha} a las ${r.datos.hora}. Código ${r.datos.codigo}.`,
      });
      navigate({ to: "/historial_citas" });
    } catch {
      toast.error("Ocurrió un error al procesar la cita urgente.");
    } finally {
      setGuardando(false);
    }
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
          <Button variant="outline" onClick={() => setAbierto(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="urgent" onClick={() => void confirmar()} disabled={guardando}>
            <BellRing className="size-4" />
            {guardando ? "Agendando..." : "Confirmar urgencia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}