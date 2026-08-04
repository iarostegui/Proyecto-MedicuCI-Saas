import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarPlus,
  Clock,
  MapPin,
  Stethoscope,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Cascara_App } from "@/components/Cascara_App";
import { Insignia_Urgente } from "@/components/Insignia_Estado";
import { Detalle_Cita } from "@/components/Detalle_Cita";
import { Selector_Fecha_Hora } from "@/components/Selector_Fecha_Hora";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SEDES, type Sede } from "@/datos/sedes";
import {
  citasDePaciente,
  crearCita,
  formatearFechaLarga,
  type Cita,
} from "@/logica/citas";
import {
  especialidadesDisponiblesEnSede,
  medicosDisponibles,
} from "@/logica/medicos";
import { obtenerSesion, type SesionActiva } from "@/logica/autenticacion";



export const Route = createFileRoute("/panel_principal")({
  head: () => ({
    meta: [
      { title: "Panel · Medicu CI" },
      {
        name: "description",
        content: "Agenda una cita y consulta tus próximas citas.",
      },
    ],
  }),
  component: Pagina_Panel_Principal,
});

function Pagina_Panel_Principal() {
  const navigate = useNavigate();
  const [sesion, setSesion] = useState<SesionActiva | null>(null);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState<Cita | null>(null);

  const recargar = useCallback((correo: string) => {
    setCitas(
      citasDePaciente(correo)
        .filter((c) => c.estado !== "Cancelada" && c.estado !== "Atendida")
        .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)),
    );
  }, []);

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      navigate({ to: "/inicio_sesion" });
      return;
    }
    if (s.rol === "Medico") {
      navigate({ to: "/panel_medico" });
      return;
    }
    setSesion(s);
    recargar(s.correo);
  }, [navigate, recargar]);

  const agrupadas = useMemo(() => {
    const map = new Map<string, Cita[]>();
    citas.forEach((c) => {
      const arr = map.get(c.fecha) ?? [];
      arr.push(c);
      map.set(c.fecha, arr);
    });
    return [...map.entries()];
  }, [citas]);

  function alGuardar(c: Cita) {
    setCitas((prev) =>
      [...prev, c].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)),
    );
    toast.success("Cita agendada", {
      description: `${c.especialidad} · ${formatearFechaLarga(c.fecha)} a las ${c.hora}. Código ${c.codigo}.`,
    });
    setAbierto(false);
  }

  if (!sesion) return null;

  return (
    <Cascara_App>
      <section className="mb-8">
        <p className="text-sm font-medium text-primary">
          Hola, {sesion.nombre.split(" ")[0]} 👋
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
        <Asistente_Reserva
          sesion={sesion}
          onCerrar={() => setAbierto(false)}
          onGuardar={alGuardar}
        />
      ) : (
        <button
          onClick={() => setAbierto(true)}
          className="group mb-8 flex w-full items-center gap-4 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/50 p-5 text-left transition-colors hover:bg-primary-soft"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)] transition-transform group-hover:scale-105">
            <CalendarPlus className="size-6" />
          </span>
          <span>
            <span className="block font-semibold text-foreground">
              Agendar nueva cita
            </span>
            <span className="block text-sm text-muted-foreground">
              Elige sede, especialidad, doctor, fecha y hora
            </span>
          </span>
          <ChevronRight className="ml-auto size-5 text-primary" />
        </button>
      )}

      {agrupadas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          Aún no tienes citas programadas.
        </div>
      ) : (
        <div className="space-y-8">
          {agrupadas.map(([fecha, items]) => (
            <div key={fecha}>
              <h2 className="mb-3 border-b border-border pb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground first-letter:uppercase">
                {formatearFechaLarga(fecha)}
              </h2>
              <ul className="space-y-3">
                {items.map((c) => (
                  <li key={c.codigo}>
                    <button
                      onClick={() => setDetalle(c)}
                      className="animate-rise flex w-full items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 text-left shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]"
                    >
                      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft py-2 text-primary">
                        <Clock className="mb-0.5 size-4" />
                        <span className="text-sm font-bold leading-none">{c.hora}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="truncate font-semibold">{c.especialidad}</p>
                          {c.esUrgente && <Insignia_Urgente />}
                        </div>
                        <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                          <Stethoscope className="size-3.5 shrink-0" />
                          {c.doctorNombre}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          {c.sede}
                        </p>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {detalle && (
        <Detalle_Cita
          cita={detalle}
          abierto={!!detalle}
          modo="panel"
          onCerrar={() => setDetalle(null)}
          onCambio={() => {
            if (sesion) recargar(sesion.correo);
          }}
        />
      )}
    </Cascara_App>
  );
}


// -------------------- Asistente de reserva --------------------

type Paso = 1 | 2 | 3 | 4;
const ETIQUETAS_PASOS: Record<Paso, string> = {
  1: "Sede",
  2: "Especialidad",
  3: "Doctor",
  4: "Fecha y hora",
};


function Asistente_Reserva({
  sesion,
  onCerrar,
  onGuardar,
}: {
  sesion: SesionActiva;
  onCerrar: () => void;
  onGuardar: (c: Cita) => void;
}) {
  const [paso, setPaso] = useState<Paso>(1);
  const [sede, setSede] = useState<Sede | "">("");
  const [especialidad, setEspecialidad] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [fecha, setFecha] = useState<string>("");
  const [hora, setHora] = useState<string>("");

  const especialidades = useMemo(
    () => (sede ? especialidadesDisponiblesEnSede(sede as Sede) : []),
    [sede],
  );
  const doctores = useMemo(
    () =>
      sede && especialidad
        ? medicosDisponibles(especialidad, sede as Sede)
        : [],
    [sede, especialidad],
  );
  const doctorSel = doctores.find((d) => d.id === doctorId);


  // Reset dependientes cuando cambia un paso previo
  useEffect(() => { setEspecialidad(""); setDoctorId(""); setFecha(""); setHora(""); }, [sede]);
  useEffect(() => { setDoctorId(""); setFecha(""); setHora(""); }, [especialidad]);
  useEffect(() => { setFecha(""); setHora(""); }, [doctorId]);
  useEffect(() => { setHora(""); }, [fecha]);


  function confirmar() {
    if (!sede || !especialidad || !doctorSel || !fecha || !hora) return;
    const nueva = crearCita({
      pacienteCorreo: sesion.correo,
      pacienteNombre: sesion.nombre,
      doctorId: doctorSel.id,
      doctorNombre: doctorSel.nombre,
      especialidad,
      sede,
      fecha,
      hora,
    });
    onGuardar(nueva);
  }

  const puedeAvanzar =
    (paso === 1 && !!sede) ||
    (paso === 2 && !!especialidad) ||
    (paso === 3 && !!doctorId) ||
    paso === 4;

  return (
    <div className="animate-rise mb-8 rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <CalendarPlus className="size-5 text-primary" />
          Nueva cita · Paso {paso} de 4 — {ETIQUETAS_PASOS[paso]}
        </h2>
        <button
          type="button"
          onClick={onCerrar}
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mb-5 flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (

          <div
            key={n}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              n <= paso ? "bg-primary" : "bg-secondary",
            )}
          />
        ))}
      </div>

      {paso === 1 && (
        <Opciones
          items={SEDES.map((s) => ({ id: s, label: s }))}
          seleccionado={sede}
          onElegir={(v) => setSede(v as Sede)}
        />
      )}
      {paso === 2 &&
        (especialidades.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" />
            <p>
              La sede <b>{sede}</b> no tiene especialidades con cupos disponibles
              en este momento. Vuelve al paso anterior y elige otra sede.
            </p>
          </div>
        ) : (
          <Opciones
            items={especialidades.map((s) => ({ id: s, label: s }))}
            seleccionado={especialidad}
            onElegir={setEspecialidad}
          />
        ))}
      {paso === 3 &&
        (doctores.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" />
            <p>
              No hay médicos de {especialidad} con cupos disponibles en {sede}.
              Vuelve y elige otra combinación.
            </p>
          </div>
        ) : (
          <Opciones
            items={doctores.map((d) => ({ id: d.id, label: d.nombre, sub: d.especialidad }))}
            seleccionado={doctorId}
            onElegir={setDoctorId}
          />
        ))}

      {paso === 4 && (
        <>
          <Selector_Fecha_Hora
            doctorId={doctorId}
            fecha={fecha}
            hora={hora}
            onFecha={setFecha}
            onHora={setHora}
            dias={21}
          />

          {hora && (
            <div className="mt-4 rounded-xl bg-secondary/60 p-4 text-sm">
              <p className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                Resumen de la cita
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li><b>Sede:</b> {sede}</li>
                <li><b>Especialidad:</b> {especialidad}</li>
                <li><b>Doctor:</b> {doctorSel?.nombre}</li>
                <li><b>Fecha:</b> {formatearFechaLarga(fecha)}</li>
                <li><b>Hora:</b> {hora}</li>
              </ul>
            </div>
          )}
        </>
      )}


      <div className="mt-5 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={() => setPaso((p) => (p > 1 ? ((p - 1) as Paso) : p))}
          disabled={paso === 1}
        >
          <ChevronLeft className="size-4" /> Atrás
        </Button>
        {paso < 4 ? (
          <Button
            onClick={() => setPaso((p) => ((p + 1) as Paso))}
            disabled={!puedeAvanzar}
          >
            Siguiente <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={confirmar} disabled={!hora}>
            Confirmar cita
          </Button>
        )}
      </div>
    </div>
  );
}

function Opciones({
  items,
  seleccionado,
  onElegir,
}: {
  items: { id: string; label: string; sub?: string }[];
  seleccionado: string;
  onElegir: (id: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onElegir(it.id)}
          className={cn(
            "rounded-xl border p-3 text-left text-sm transition-colors",
            it.id === seleccionado
              ? "border-primary bg-primary-soft text-primary"
              : "border-border hover:bg-secondary",
          )}
        >
          <div className="font-semibold">{it.label}</div>
          {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
        </button>
      ))}
    </div>
  );
}
