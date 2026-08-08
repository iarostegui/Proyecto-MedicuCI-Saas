import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Cascara_App } from "@/components/Cascara_App";
import { Button } from "@/components/ui/button";
import {
  obtenerDisponibilidad,
  guardarDisponibilidad,
  DIAS_SEMANA_ETIQUETAS,
  type Disponibilidad,
} from "@/servicios/servicio_agenda";
import { obtenerSesion, buscarMedicoPorCorreo } from "@/servicios/servicio_sesion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CalendarClock, Plus, X } from "lucide-react";

export const Route = createFileRoute("/disponibilidad_medico")({
  head: () => ({
    meta: [
      { title: "Disponibilidad · Medicu CI" },
      { name: "description", content: "Gestiona tus días y horarios de atención." },
    ],
  }),
  component: Pagina_Disponibilidad,
});

function Pagina_Disponibilidad() {
  const navigate = useNavigate();
  const [disp, setDisp] = useState<Disponibilidad | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState("");

  useEffect(() => {
    const s = obtenerSesion();
    if (!s || s.rol !== "Medico") {
      navigate({ to: "/inicio_sesion" });
      return;
    }
    const m = buscarMedicoPorCorreo(s.correo);
    if (!m) {
      navigate({ to: "/inicio_sesion" });
      return;
    }
    setDisp(obtenerDisponibilidad(m.id));
  }, [navigate]);

  if (!disp) return null;

  function toggleDia(n: number) {
    if (!disp) return;
    const dias = disp.diasSemana.includes(n)
      ? disp.diasSemana.filter((d) => d !== n)
      : [...disp.diasSemana, n].sort();
    setDisp({ ...disp, diasSemana: dias });
  }

  function agregarBloqueada() {
    if (!disp || !nuevaFecha) return;
    if (disp.fechasBloqueadas.includes(nuevaFecha)) return;
    setDisp({
      ...disp,
      fechasBloqueadas: [...disp.fechasBloqueadas, nuevaFecha].sort(),
    });
    setNuevaFecha("");
  }

  function quitarBloqueada(f: string) {
    if (!disp) return;
    setDisp({
      ...disp,
      fechasBloqueadas: disp.fechasBloqueadas.filter((x) => x !== f),
    });
  }

  function guardar() {
    if (!disp) return;
    if (disp.diasSemana.length === 0) {
      toast.error("Selecciona al menos un día de atención.");
      return;
    }
    if (disp.horaInicio >= disp.horaFin) {
      toast.error("La hora de inicio debe ser menor a la de fin.");
      return;
    }
    if (disp.duracionMin < 10 || disp.duracionMin > 120) {
      toast.error("La duración debe estar entre 10 y 120 minutos.");
      return;
    }
    guardarDisponibilidad(disp);
    toast.success("Disponibilidad guardada");
  }

  return (
    <Cascara_App>
      <section className="mb-6">
        <p className="text-sm font-medium text-primary">Configuración</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Mi disponibilidad
        </h1>
        <p className="mt-1 text-muted-foreground">
          Define los días, el horario y la duración de tus consultas.
        </p>
      </section>

      <div className="space-y-5 rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]">
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="size-4 text-primary" /> Días de atención
          </h2>
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA_ETIQUETAS.map((label, i) => {
              const activo = disp.diasSemana.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => toggleDia(i)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
                    activo
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-background text-muted-foreground ring-border hover:bg-secondary",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
              Hora inicio
            </span>
            <input
              type="time"
              value={disp.horaInicio}
              onChange={(e) => setDisp({ ...disp, horaInicio: e.target.value })}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
              Hora fin
            </span>
            <input
              type="time"
              value={disp.horaFin}
              onChange={(e) => setDisp({ ...disp, horaFin: e.target.value })}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
              Duración (min)
            </span>
            <input
              type="number"
              min={10}
              max={120}
              step={5}
              value={disp.duracionMin}
              onChange={(e) =>
                setDisp({ ...disp, duracionMin: parseInt(e.target.value || "0", 10) })
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Fechas bloqueadas
          </h2>
          <div className="flex gap-2">
            <input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
            />
            <Button variant="outline" onClick={agregarBloqueada}>
              <Plus className="size-4" /> Añadir
            </Button>
          </div>
          {disp.fechasBloqueadas.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {disp.fechasBloqueadas.map((f) => (
                <li
                  key={f}
                  className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive"
                >
                  {f}
                  <button
                    onClick={() => quitarBloqueada(f)}
                    className="grid size-4 place-items-center rounded-full hover:bg-destructive/20"
                    aria-label={`Quitar ${f}`}
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={guardar}>Guardar disponibilidad</Button>
        </div>
      </div>
    </Cascara_App>
  );
}
