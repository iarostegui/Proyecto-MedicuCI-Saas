import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, Stethoscope, ChevronRight, Download } from "lucide-react";
import { Cascara_App } from "@/components/Cascara_App";
import { Insignia_Estado, Insignia_Urgente } from "@/components/Insignia_Estado";
import { Detalle_Cita } from "@/components/Detalle_Cita";
import {
  citasDePaciente,
  fechaCorta,
  ESTADOS_CITA,
  type Cita,
  type EstadoCita,
} from "@/servicios/servicio_citas";
import { descargarComprobantePDF } from "@/servicios/servicio_exportacion";
import { obtenerSesion } from "@/servicios/servicio_sesion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/historial_citas")({
  head: () => ({
    meta: [
      { title: "Historial · Medicu CI" },
      {
        name: "description",
        content: "Consulta tu historial de citas médicas organizado por fecha.",
      },
    ],
  }),
  component: Pagina_Historial_Citas,
});

type FiltroHistorial = "todas" | EstadoCita;
const filtros: { key: FiltroHistorial; label: string }[] = [
  { key: "todas", label: "Todas" },
  ...ESTADOS_CITA.map((e) => ({ key: e as FiltroHistorial, label: e })),
];

function Pagina_Historial_Citas() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroHistorial>("todas");
  const [citas, setCitas] = useState<Cita[]>([]);
  const [seleccion, setSeleccion] = useState<Cita | null>(null);

  function recargar(correo: string) {
    setCitas(citasDePaciente(correo));
  }

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) {
      navigate({ to: "/inicio_sesion" });
      return;
    }
    recargar(sesion.correo);
  }, [navigate]);

  const resultados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return citas
      .filter((c) => (filtro === "todas" ? true : c.estado === filtro))
      .filter((c) =>
        (c.especialidad + " " + c.doctorNombre + " " + c.sede + " " + c.codigo)
          .toLowerCase()
          .includes(q),
      )
      .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  }, [busqueda, filtro, citas]);

  const agrupadas = useMemo(() => {
    const map = new Map<string, Cita[]>();
    resultados.forEach((c) => {
      const clave = new Date(c.fecha + "T00:00:00").toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      });
      const arr = map.get(clave) ?? [];
      arr.push(c);
      map.set(clave, arr);
    });
    return [...map.entries()];
  }, [resultados]);

  return (
    <Cascara_App>
      <section className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Historial de citas
        </h1>
        <p className="mt-1 text-muted-foreground">
          Todas tus citas médicas, con detalle y comprobante PDF.
        </p>
      </section>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por especialidad, doctor, sede o código…"
          className="h-11 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <div className="mb-7 flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
              filtro === f.key
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card text-muted-foreground ring-border hover:bg-secondary",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {agrupadas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          No se encontraron citas con esos criterios.
        </div>
      ) : (
        <div className="space-y-8">
          {agrupadas.map(([mes, items]) => (
            <div key={mes}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground first-letter:uppercase">
                {mes}
              </h2>
              <ul className="space-y-3">
                {items.map((c) => {
                  const { dia, mes: mesCorto } = fechaCorta(c.fecha);
                  return (
                    <li
                      key={c.codigo}
                      className="animate-rise group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]"
                    >
                      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary py-2">
                        <span className="text-lg font-extrabold leading-none text-foreground">
                          {dia}
                        </span>
                        <span className="text-[11px] font-medium uppercase text-muted-foreground">
                          {mesCorto}
                        </span>
                      </div>
                      <button
                        onClick={() => setSeleccion(c)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{c.especialidad}</p>
                          <Insignia_Estado estado={c.estado} />
                          {c.esUrgente && <Insignia_Urgente />}
                        </div>
                        <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                          <Stethoscope className="size-3.5 shrink-0" />
                          {c.doctorNombre} · {c.hora}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {c.sede} · {c.codigo}
                        </p>
                      </button>
                      <button
                        onClick={() => descargarComprobantePDF(c)}
                        aria-label="Descargar comprobante"
                        className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <Download className="size-4" />
                      </button>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {seleccion && (
        <Detalle_Cita
          cita={seleccion}
          abierto={!!seleccion}
          modo="historial"
          onCerrar={() => setSeleccion(null)}
          onCambio={() => {
            const s = obtenerSesion();
            if (s) recargar(s.correo);
          }}
        />
      )}

    </Cascara_App>
  );
}
