import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Clock, MapPin, CalendarPlus, Stethoscope, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  upcomingSeed,
  specialties,
  doctors,
  formatLongDate,
  type Appointment,
} from "@/lib/appointments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/panel")({
  head: () => ({
    meta: [
      { title: "Panel · Clínica Vital" },
      { name: "description", content: "Agenda una cita rápida y consulta tus citas próximas." },
    ],
  }),
  component: PanelPage,
});

function PanelPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(upcomingSeed);
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    [...appointments]
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .forEach((a) => {
        const arr = map.get(a.date) ?? [];
        arr.push(a);
        map.set(a.date, arr);
      });
    return [...map.entries()];
  }, [appointments]);

  function addAppointment(a: Appointment) {
    setAppointments((prev) => [...prev, a]);
    toast.success("Cita agendada", {
      description: `${a.specialty} · ${formatLongDate(a.date)} a las ${a.time}`,
    });
  }

  return (
    <AppShell>
      <section className="mb-8">
        <p className="text-sm font-medium text-primary">Hola, Carlos 👋</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Tus próximas citas
        </h1>
        <p className="mt-1 text-muted-foreground">
          {appointments.length} cita{appointments.length !== 1 && "s"} programada
          {appointments.length !== 1 && "s"}.
        </p>
      </section>

      {/* Quick book */}
      {open ? (
        <QuickBook onClose={() => setOpen(false)} onSave={addAppointment} />
      ) : (
        <button
          onClick={() => setOpen(true)}
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

      {/* Upcoming grouped */}
      <div className="space-y-8">
        {grouped.map(([date, items]) => (
          <div key={date}>
            <h2 className="mb-3 border-b border-border pb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground first-letter:uppercase">
              {formatLongDate(date)}
            </h2>
            <ul className="space-y-3">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="animate-rise group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]"
                >
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft py-2 text-primary">
                    <Clock className="mb-0.5 size-4" />
                    <span className="text-sm font-bold leading-none">{a.time}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.specialty}</p>
                    <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <Stethoscope className="size-3.5 shrink-0" />
                      {a.doctor}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      {a.location}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function QuickBook({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (a: Appointment) => void;
}) {
  const [specialty, setSpecialty] = useState(specialties[0]);
  const [doctor, setDoctor] = useState(doctors[0]);
  const [date, setDate] = useState(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");

  function save(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: crypto.randomUUID(),
      specialty,
      doctor,
      location: "Torre Médica · por confirmar",
      date,
      time,
      status: "pendiente",
    });
    onClose();
  }

  return (
    <form
      onSubmit={save}
      className="animate-rise mb-8 rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <CalendarPlus className="size-5 text-primary" />
          Nueva cita
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Especialidad" className="sm:col-span-2">
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={selectCls}>
            {specialties.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Profesional" className="sm:col-span-2">
          <select value={doctor} onChange={(e) => setDoctor(e.target.value)} className={selectCls}>
            {doctors.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Fecha">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectCls} />
        </Labeled>
        <Labeled label="Hora">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={selectCls} />
        </Labeled>
      </div>

      <Button type="submit" size="lg" className="mt-5 w-full">
        Confirmar cita
      </Button>
    </form>
  );
}

const selectCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20";

function Labeled({
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
