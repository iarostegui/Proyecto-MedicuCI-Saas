import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Stethoscope, FileText, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import {
  historySeed,
  shortDate,
  type Appointment,
  type AppointmentStatus,
} from "@/lib/appointments";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/historial")({
  head: () => ({
    meta: [
      { title: "Historial · Clínica Vital" },
      { name: "description", content: "Consulta tu historial de citas médicas organizado por fecha." },
    ],
  }),
  component: HistoryPage,
});

type Filter = "todas" | AppointmentStatus;
const filters: { key: Filter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "completada", label: "Completadas" },
  { key: "cancelada", label: "Canceladas" },
  { key: "urgente", label: "Urgentes" },
];

function HistoryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");

  const results = useMemo(() => {
    return historySeed
      .filter((a) => (filter === "todas" ? true : a.status === filter))
      .filter((a) =>
        (a.specialty + " " + a.doctor + " " + a.location)
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [query, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    results.forEach((a) => {
      const key = new Date(a.date + "T00:00:00").toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      });
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    });
    return [...map.entries()];
  }, [results]);

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Historial de citas</h1>
        <p className="mt-1 text-muted-foreground">Tu recorrido médico, organizado y a la mano.</p>
      </section>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por especialidad, doctor o lugar…"
          className="h-11 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {/* Filters */}
      <div className="mb-7 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card text-muted-foreground ring-border hover:bg-secondary",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          No se encontraron citas con esos criterios.
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([month, items]) => (
            <div key={month}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground first-letter:uppercase">
                {month}
              </h2>
              <ul className="space-y-3">
                {items.map((a) => {
                  const { day, month: mon } = shortDate(a.date);
                  return (
                    <li
                      key={a.id}
                      className="animate-rise group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]"
                    >
                      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary py-2">
                        <span className="text-lg font-extrabold leading-none text-foreground">
                          {day}
                        </span>
                        <span className="text-[11px] font-medium uppercase text-muted-foreground">
                          {mon}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="truncate font-semibold">{a.specialty}</p>
                          <StatusBadge status={a.status} />
                        </div>
                        <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                          <Stethoscope className="size-3.5 shrink-0" />
                          {a.doctor} · {a.time}
                        </p>
                        {a.note && (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-medium text-primary">
                            <FileText className="size-3.5 shrink-0" />
                            {a.note}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
