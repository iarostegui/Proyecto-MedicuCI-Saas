import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Search,
  Users,
  Calendar as CalIcon,
  X,
  CheckSquare,
  Square,
  Settings2,
  CalendarDays,
  CalendarCheck2,
  CalendarX2,
  Clock,
  Download,
  Printer,
} from "lucide-react";
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
  ESTADOS_CITA,
  type Cita,
  type EstadoCita,
} from "@/servicios/servicio_citas";
import { SEDES, type Sede } from "@/datos/sedes";
import {
  obtenerSesion,
  buscarMedicoPorCorreo,
  type SesionActiva,
} from "@/servicios/servicio_sesion";
import {
  fechasDisponibles,
  slotsDisponibles,
} from "@/servicios/servicio_agenda";
import { exportarCitasCSV, imprimirCitas } from "@/servicios/servicio_exportacion";
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

type Orden = "proximas" | "recientes" | "nombre";

function Pagina_Panel_Medico() {
  const navigate = useNavigate();
  const [sesion, setSesion] = useState<SesionActiva | null>(null);
  const [doctorId, setDoctorId] = useState<string>("");
  const [citas, setCitas] = useState<Cita[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [sedeFiltro, setSedeFiltro] = useState<Sede | "todas">("todas");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCita | "todas">("todas");
  const [orden, setOrden] = useState<Orden>("proximas");
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [detalle, setDetalle] = useState<Cita | null>(null);
  const [modalCancelar, setModalCancelar] = useState(false);
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

  // KPIs — todos calculados sólo sobre las citas del médico logueado.
  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const activas = citas.filter(
      (c) => c.estado === "Programada" || c.estado === "Reprogramada",
    );
    const delDia = activas.filter((c) => c.fecha === hoy).length;
    const proximas = activas.filter((c) => c.fecha > hoy).length;
    const canceladas = citas.filter((c) => c.estado === "Cancelada").length;
    let slotsLibres = 0;
    if (doctorId) {
      for (const f of fechasDisponibles(doctorId, 14)) {
        slotsLibres += slotsDisponibles(doctorId, f).length;
      }
    }
    return {
      totales: activas.length,
      delDia,
      proximas,
      canceladas,
      slotsLibres,
    };
  }, [citas, doctorId]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = citas
      .filter((c) => (estadoFiltro === "todas" ? true : c.estado === estadoFiltro))
      .filter((c) => (sedeFiltro === "todas" ? true : c.sede === sedeFiltro))
      .filter((c) => (fechaFiltro ? c.fecha === fechaFiltro : true))
      .filter((c) =>
        !q
          ? true
          : (c.pacienteNombre + " " + (c.pacienteDni ?? "") + " " + c.codigo)
              .toLowerCase()
              .includes(q),
      );
    const hoy = new Date().toISOString().slice(0, 10);
    return lista.sort((a, b) => {
      if (orden === "nombre")
        return a.pacienteNombre.localeCompare(b.pacienteNombre, "es");
      if (orden === "recientes") return b.fechaCreacion.localeCompare(a.fechaCreacion);
      // próximas: futuras ascendentes primero, pasadas al final descendentes
      const aFut = a.fecha >= hoy;
      const bFut = b.fecha >= hoy;
      if (aFut !== bFut) return aFut ? -1 : 1;
      const cmp = (a.fecha + a.hora).localeCompare(b.fecha + b.hora);
      return aFut ? cmp : -cmp;
    });
  }, [citas, busqueda, fechaFiltro, sedeFiltro, estadoFiltro, orden]);

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
    if (!motivoDetalle.trim()) {
      toast.error("El motivo es obligatorio para cancelar.");
      return;
    }
    let n = 0;
    seleccionadas.forEach((cod) => {
      cancelarCita(cod, "Cancelada por el médico", motivoDetalle.trim());
      n++;
    });
    toast.success(`${n} cita${n !== 1 ? "s" : ""} cancelada${n !== 1 ? "s" : ""}`);
    setSeleccionadas(new Set());
    setModalCancelar(false);
    setMotivoDetalle("");
    recargar(doctorId);
  }

  function exportarMisCitas() {
    if (filtradas.length === 0) {
      toast.error("No hay citas para exportar.");
      return;
    }
    const nombre = `medicu_citas_${sesion?.correo.split("@")[0] ?? "medico"}`;
    exportarCitasCSV(filtradas, nombre);
    toast.success(`Exportadas ${filtradas.length} cita(s).`);
  }

  function imprimirMisCitas() {
    if (filtradas.length === 0) {
      toast.error("No hay citas para imprimir.");
      return;
    }
    imprimirCitas(filtradas, `Citas de ${sesion?.nombre ?? ""}`);
  }

  if (!sesion) return null;

  return (
    <Cascara_App>
      <section className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Bienvenido/a</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {sesion.nombre}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Tu agenda personal — sólo ves y administras tus propios pacientes.
          </p>
        </div>
        <Link
          to="/disponibilidad_medico"
          className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft/70"
        >
          <Settings2 className="size-4" />
          Mi disponibilidad
        </Link>
      </section>

      {/* Dashboard */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi icon={<CalendarDays className="size-4" />} etiqueta="Programadas" valor={kpis.totales} />
        <Kpi icon={<CalendarCheck2 className="size-4" />} etiqueta="Hoy" valor={kpis.delDia} tono="primario" />
        <Kpi icon={<CalendarDays className="size-4" />} etiqueta="Próximas" valor={kpis.proximas} />
        <Kpi icon={<CalendarX2 className="size-4" />} etiqueta="Canceladas" valor={kpis.canceladas} tono="peligro" />
        <Kpi icon={<Clock className="size-4" />} etiqueta="Cupos libres (14d)" valor={kpis.slotsLibres} />
      </div>

      {/* Filtros */}
      <div className="mb-4 grid gap-2 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)] sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar paciente, DNI o código…"
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <input
          type="date"
          value={fechaFiltro}
          onChange={(e) => setFechaFiltro(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        />
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
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as Orden)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm sm:col-span-2 lg:col-span-1"
        >
          <option value="proximas">Ordenar: próximas primero</option>
          <option value="recientes">Ordenar: más recientes</option>
          <option value="nombre">Ordenar: nombre del paciente</option>
        </select>
      </div>

      {/* Acciones masivas + exportar/imprimir */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/60 px-4 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleTodas}
            disabled={cancelables.length === 0}
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground disabled:opacity-40"
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportarMisCitas}>
            <Download className="size-4" /> Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={imprimirMisCitas}>
            <Printer className="size-4" /> Imprimir
          </Button>
        </div>
      </div>

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
                    {c.pacienteDni ? ` · DNI ${c.pacienteDni}` : ""}
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
              como canceladas y los horarios quedarán liberados. El motivo es obligatorio
              y se mostrará al paciente en las observaciones.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Motivo *
              </span>
              <textarea
                value={motivoDetalle}
                onChange={(e) => setMotivoDetalle(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background p-2 text-sm"
                placeholder="Ej. Emergencia médica del profesional…"
              />
            </label>
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

function Kpi({
  icon,
  etiqueta,
  valor,
  tono,
}: {
  icon: React.ReactNode;
  etiqueta: string;
  valor: number;
  tono?: "primario" | "peligro";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]",
        tono === "primario" && "border-primary/40 bg-primary-soft/40",
        tono === "peligro" && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-md bg-secondary text-foreground",
            tono === "primario" && "bg-primary text-primary-foreground",
            tono === "peligro" && "bg-destructive/15 text-destructive",
          )}
        >
          {icon}
        </span>
        {etiqueta}
      </div>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{valor}</p>
    </div>
  );
}
