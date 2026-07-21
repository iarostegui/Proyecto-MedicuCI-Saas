import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, Users, Calendar as CalIcon, X, CheckSquare, Square, Settings2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Cascara_App } from "@/components/Cascara_App";
import { Insignia_Estado, Insignia_Urgente } from "@/components/Insignia_Estado";
import { Detalle_Cita } from "@/components/Detalle_Cita";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  citasDeDoctor,
  cancelarCita,
  MOTIVOS_CANCELACION,
  ESTADOS_CITA,
  type Cita,
  type EstadoCita,
  type MotivoCancelacion,
} from "@/logica/citas";
import { SEDES, type Sede } from "@/datos/sedes";
import {
  obtenerSesion,
  buscarMedicoPorCorreo,
  type SesionActiva,
} from "@/logica/autenticacion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/panel_medico")({
  head: () => ({
    meta: [
      { title: "Panel médico · Medicu CI" },
      {
        name: "description",
        content: "Panel exclusivo del personal médico de Medicu CI.",
      },
    ],
  }),
  component: Pagina_Panel_Medico,
});

function Pagina_Panel_Medico() {
  const navigate = useNavigate();
  const [sesion, setSesion] = useState<SesionActiva | null>(null);
  const [doctorId, setDoctorId] = useState<string>("");
  const [citas, setCitas] = useState<Cita[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [sedeFiltro, setSedeFiltro] = useState<Sede | "todas">("todas");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCita | "todas">("todas");
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [detalle, setDetalle] = useState<Cita | null>(null);
  const [modalCancelar, setModalCancelar] = useState(false);
  const [motivo, setMotivo] = useState<MotivoCancelacion>(MOTIVOS_CANCELACION[0]);
  const [motivoDetalle, setMotivoDetalle] = useState("");

  function recargar(id: string) {
    setCitas(citasDeDoctor(id));
  }

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      navigate({ to: "/inicio_sesion" });
      return;
    }
    if (s.rol !== "Medico") {
      navigate({ to: "/panel_principal" });
      return;
    }
    const medico = buscarMedicoPorCorreo(s.correo);
    if (!medico) {
      navigate({ to: "/inicio_sesion" });
      return;
    }
    setSesion(s);
    setDoctorId(medico.id);
    recargar(medico.id);
  }, [navigate]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return citas
      .filter((c) => (estadoFiltro === "todas" ? true : c.estado === estadoFiltro))
      .filter((c) => (sedeFiltro === "todas" ? true : c.sede === sedeFiltro))
      .filter((c) => (fechaDesde ? c.fecha >= fechaDesde : true))
      .filter((c) => (fechaHasta ? c.fecha <= fechaHasta : true))
      .filter((c) =>
        !q
          ? true
          : (c.pacienteNombre + " " + (c.pacienteDni ?? "") + " " + c.codigo)
              .toLowerCase()
              .includes(q),
      )
      .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  }, [citas, busqueda, fechaDesde, fechaHasta, sedeFiltro, estadoFiltro]);

  const cancelables = filtradas.filter(
    (c) => c.estado === "Programada" || c.estado === "Reprogramada",
  );
  const todasSel =
    cancelables.length > 0 && cancelables.every((c) => seleccionadas.has(c.codigo));

  function toggleTodas() {
    if (todasSel) setSeleccionadas(new Set());
    else setSeleccionadas(new Set(cancelables.map((c) => c.codigo)));
  }

  function toggleUna(codigo: string) {
    const n = new Set(seleccionadas);
    if (n.has(codigo)) n.delete(codigo);
    else n.add(codigo);
    setSeleccionadas(n);
  }

  function confirmarCancelacion() {
    if (motivo === "Otro" && !motivoDetalle.trim()) {
      toast.error("Escribe el motivo específico.");
      return;
    }
    let n = 0;
    seleccionadas.forEach((cod) => {
      cancelarCita(cod, motivo, motivo === "Otro" ? motivoDetalle.trim() : undefined);
      n++;
    });
    toast.success(`${n} cita${n !== 1 ? "s" : ""} cancelada${n !== 1 ? "s" : ""}`);
    setSeleccionadas(new Set());
    setModalCancelar(false);
    setMotivoDetalle("");
    recargar(doctorId);
  }

  if (!sesion) return null;

  return (
    <Cascara_App>
      <section className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Bienvenido/a</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {sesion.nombre}
          </h1>
          <p className="mt-1 text-muted-foreground">Panel del personal médico.</p>
        </div>
        <Link
          to="/disponibilidad_medico"
          className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft/70"
        >
          <Settings2 className="size-4" />
          Mi disponibilidad
        </Link>
      </section>

      {/* Filtros */}
      <div className="mb-4 grid gap-2 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)] sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar paciente, DNI o código…"
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <select
          value={sedeFiltro}
          onChange={(e) => setSedeFiltro(e.target.value as Sede | "todas")}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="todas">Todas las sedes</option>
          {SEDES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as EstadoCita | "todas")}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="todas">Todos los estados</option>
          {ESTADOS_CITA.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <label className="text-xs text-muted-foreground">
          Desde
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Hasta
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </label>
      </div>

      {/* Barra de selección masiva */}
      {cancelables.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-2">
          <button
            onClick={toggleTodas}
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground"
          >
            {todasSel ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
            Seleccionar todas ({cancelables.length})
          </button>
          <Button
            variant="destructive"
            size="sm"
            disabled={seleccionadas.size === 0}
            onClick={() => setModalCancelar(true)}
          >
            <X className="size-4" />
            Cancelar seleccionadas ({seleccionadas.size})
          </Button>
        </div>
      )}

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          <Users className="mx-auto mb-2 size-8 opacity-60" />
          No hay citas con estos filtros.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtradas.map((c) => {
            const puedeSel = c.estado === "Programada" || c.estado === "Reprogramada";
            const sel = seleccionadas.has(c.codigo);
            return (
              <li
                key={c.codigo}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]"
              >
                <button
                  onClick={() => puedeSel && toggleUna(c.codigo)}
                  disabled={!puedeSel}
                  className={cn(
                    "grid size-8 place-items-center rounded-md",
                    puedeSel ? "hover:bg-secondary" : "opacity-30",
                  )}
                >
                  {sel ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                </button>
                <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-secondary py-1.5">
                  <CalIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold">{c.fecha.slice(5)}</span>
                  <span className="text-[11px] text-muted-foreground">{c.hora}</span>
                </div>
                <button
                  onClick={() => setDetalle(c)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{c.pacienteNombre}</p>
                    <Insignia_Estado estado={c.estado} />
                    {c.esUrgente && <Insignia_Urgente />}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.especialidad} · {c.sede} · {c.codigo}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {detalle && (
        <Detalle_Cita
          cita={detalle}
          abierto={!!detalle}
          modo="medico"
          onCerrar={() => setDetalle(null)}
          onCambio={() => recargar(doctorId)}
        />
      )}


      <Dialog open={modalCancelar} onOpenChange={setModalCancelar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar citas seleccionadas</DialogTitle>
            <DialogDescription>
              {seleccionadas.size} cita{seleccionadas.size !== 1 ? "s" : ""} se marcarán
              como canceladas y los horarios quedarán libres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Motivo
              </span>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as MotivoCancelacion)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {MOTIVOS_CANCELACION.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            {motivo === "Otro" && (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Detalle
                </span>
                <textarea
                  value={motivoDetalle}
                  onChange={(e) => setMotivoDetalle(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background p-2 text-sm"
                  placeholder="Especifica el motivo…"
                />
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalCancelar(false)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={confirmarCancelacion}>
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Cascara_App>
  );
}
