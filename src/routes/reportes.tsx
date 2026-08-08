import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BarChart3, TrendingUp, AlertOctagon } from "lucide-react";
import { Cascara_App } from "@/components/Cascara_App";
import { generarReporte, type Conteo, type ResumenReportes } from "@/servicios/servicio_reportes";
import { SEDES } from "@/datos/sedes";
import { obtenerSesion } from "@/servicios/servicio_sesion";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes · Medicu CI" },
      { name: "description", content: "Métricas y estadísticas de las citas." },
    ],
  }),
  component: Pagina_Reportes,
});

function Pagina_Reportes() {
  const navigate = useNavigate();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sede, setSede] = useState<string>("");
  const [datos, setDatos] = useState<ResumenReportes | null>(null);

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      navigate({ to: "/inicio_sesion" });
      return;
    }
    if (s.rol === "Paciente") {
      navigate({ to: "/panel_principal" });
      return;
    }
  }, [navigate]);

  useEffect(() => {
    setDatos(generarReporte({ desde: desde || undefined, hasta: hasta || undefined, sede: sede || undefined }));
  }, [desde, hasta, sede]);

  if (!datos) return null;

  return (
    <Cascara_App>
      <section className="mb-6">
        <p className="text-sm font-medium text-primary">Analítica</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Reportes y métricas
        </h1>
        <p className="mt-1 text-muted-foreground">
          Rendimiento operativo: citas por estado, sede, especialidad y médico.
        </p>
      </section>

      <div className="mb-5 grid gap-2 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">
          Desde
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Hasta
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Sede
          <select
            value={sede}
            onChange={(e) => setSede(e.target.value)}
            className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Todas</option>
            {SEDES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <TarjetaKPI icon={<BarChart3 className="size-5" />} etiqueta="Citas totales" valor={datos.total} />
        <TarjetaKPI icon={<TrendingUp className="size-5" />} etiqueta="Atendidas" valor={datos.porEstado.find((e) => e.clave === "Atendida")?.valor ?? 0} />
        <TarjetaKPI icon={<AlertOctagon className="size-5" />} etiqueta="Urgentes" valor={datos.urgentes} />
      </div>

      <Panel titulo="Por estado" items={datos.porEstado} />
      <Panel titulo="Por sede" items={datos.porSede} />
      <Panel titulo="Por especialidad" items={datos.porEspecialidad} />
      <Panel titulo="Por médico" items={datos.porMedico} />
      <Panel titulo="Últimos 14 días" items={datos.ultimosDias} orden="original" />
    </Cascara_App>
  );
}

function TarjetaKPI({
  icon,
  etiqueta,
  valor,
}: {
  icon: React.ReactNode;
  etiqueta: string;
  valor: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)]">
      <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
        <p className="text-2xl font-extrabold">{valor}</p>
      </div>
    </div>
  );
}

function Panel({
  titulo,
  items,
  orden = "desc",
}: {
  titulo: string;
  items: Conteo[];
  orden?: "desc" | "original";
}) {
  const lista = useMemo(
    () => (orden === "original" ? items : [...items].sort((a, b) => b.valor - a.valor)),
    [items, orden],
  );
  const max = Math.max(1, ...lista.map((i) => i.valor));
  return (
    <section className="mb-5 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)]">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <ul className="space-y-2">
          {lista.map((i) => (
            <li key={i.clave} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-sm font-medium">{i.clave}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(i.valor / max) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums">
                {i.valor}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
