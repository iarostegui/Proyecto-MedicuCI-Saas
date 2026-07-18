import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Clock, MapPin, CalendarPlus, Stethoscope, X } from "lucide-react";
import { Cascara_App } from "@/components/Cascara_App";
import { Insignia_Estado } from "@/components/Insignia_Estado";
import { Button } from "@/components/ui/button";
import {
  CITAS_PROXIMAS_SEMILLA,
  DOCTORES,
  ESPECIALIDADES,
  formatearFechaLarga,
  type Cita,
} from "@/logica/citas";
import { obtenerSesion } from "@/logica/autenticacion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/panel_principal")({
  head: () => ({
    meta: [
      { title: "Panel · Medicu CI" },
      {
        name: "description",
        content: "Agenda una cita rápida y consulta tus citas próximas.",
      },
    ],
  }),
  component: Pagina_Panel_Principal,
});

function Pagina_Panel_Principal() {
  const navigate = useNavigate();
  const [nombreUsuario, setNombreUsuario] = useState<string>("");
  const [citas, setCitas] = useState<Cita[]>(CITAS_PROXIMAS_SEMILLA);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) {
      navigate({ to: "/inicio_sesion" });
      return;
    }
    if (sesion.rol === "Medico") {
      navigate({ to: "/panel_medico" });
      return;
    }
    setNombreUsuario(sesion.nombre);
  }, [navigate]);

  const agrupadas = useMemo(() => {
    const map = new Map<string, Cita[]>();
    [...citas]
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
      .forEach((c) => {
        const arr = map.get(c.fecha) ?? [];
        arr.push(c);
        map.set(c.fecha, arr);
      });
    return [...map.entries()];
  }, [citas]);

  function agregarCita(c: Cita) {
    setCitas((prev) => [...prev, c]);
    toast.success("Cita agendada", {
      description: `${c.especialidad} · ${formatearFechaLarga(c.fecha)} a las ${c.hora}`,
    });
  }

  return (
    <Cascara_App>
      <section className="mb-8">
        <p className="text-sm font-medium text-primary">
          Hola{nombreUsuario ? `, ${nombreUsuario.split(" ")[0]}` : ""} 👋
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Tus próximas citas
        </h1>
        <p className="mt-1 text-muted-foreground">
          {citas.length} cita{citas.length !== 1 && "s"} programada
          {citas.length !== 1 && "s"}.
        </p>
      </section>

      {abierto ? (
        <Reserva_Rapida onCerrar={() => setAbierto(false)} onGuardar={agregarCita} />
      ) : (
        <button
          onClick={() => setAbierto(true)}
          className="group mb-8 flex w-full items-center gap-4 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/50 p-5 text-left transition-colors hover:bg-primary-soft"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)] transition-transform group-hover:scale-105">
            <CalendarPlus className="size-6" />
          </span>
          <span>
            <span className="block font-semibold text-foreground">Agendar nueva cita</span>
            <span className="block text-sm text-muted-foreground">
              Elige especialidad, fecha y hora en segundos
            </span>
          </span>
          <Plus className="ml-auto size-5 text-primary" />
        </button>
      )}

      <div className="space-y-8">
        {agrupadas.map(([fecha, items]) => (
          <div key={fecha}>
            <h2 className="mb-3 border-b border-border pb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground first-letter:uppercase">
              {formatearFechaLarga(fecha)}
            </h2>
            <ul className="space-y-3">
              {items.map((c) => (
                <li
                  key={c.id}
                  className="animate-rise group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]"
                >
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft py-2 text-primary">
                    <Clock className="mb-0.5 size-4" />
                    <span className="text-sm font-bold leading-none">{c.hora}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.especialidad}</p>
                    <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <Stethoscope className="size-3.5 shrink-0" />
                      {c.doctor}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      {c.ubicacion}
                    </p>
                  </div>
                  <Insignia_Estado estado={c.estado} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Cascara_App>
  );
}

function Reserva_Rapida({
  onCerrar,
  onGuardar,
}: {
  onCerrar: () => void;
  onGuardar: (c: Cita) => void;
}) {
  const [especialidad, setEspecialidad] = useState(ESPECIALIDADES[0]);
  const [doctor, setDoctor] = useState(DOCTORES[0]);
  const [fecha, setFecha] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
  );
  const [hora, setHora] = useState("10:00");

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    onGuardar({
      id: crypto.randomUUID(),
      especialidad,
      doctor,
      ubicacion: "Torre Médica · por confirmar",
      fecha,
      hora,
      estado: "pendiente",
    });
    onCerrar();
  }

  return (
    <form
      onSubmit={guardar}
      className="animate-rise mb-8 rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <CalendarPlus className="size-5 text-primary" />
          Nueva cita
        </h2>
        <button
          type="button"
          onClick={onCerrar}
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Etiquetado label="Especialidad" className="sm:col-span-2">
          <select
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
            className={selectCls}
          >
            {ESPECIALIDADES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Etiquetado>
        <Etiquetado label="Profesional" className="sm:col-span-2">
          <select
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            className={selectCls}
          >
            {DOCTORES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Etiquetado>
        <Etiquetado label="Fecha">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={selectCls}
          />
        </Etiquetado>
        <Etiquetado label="Hora">
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className={selectCls}
          />
        </Etiquetado>
      </div>

      <Button type="submit" size="lg" className="mt-5 w-full">
        Confirmar cita
      </Button>
    </form>
  );
}

const selectCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20";

function Etiquetado({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
