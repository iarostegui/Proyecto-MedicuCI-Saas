// SOLID - SRP
// Este componente solo resuelve la selección de fecha y hora.
// SOLID - DIP
// Depende del servicio de agenda, no del almacenamiento de datos.
import { useMemo } from "react";
import { CalendarOff, Info } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fechasDeMedico, horariosDeMedico } from "@/servicios/servicio_agenda";
import { formatearFechaLarga } from "@/logica/citas";
import { fechaLocalISO } from "@/logica/disponibilidad";

interface Props {
  doctorId: string;
  fecha: string;
  hora: string;
  onFecha: (fecha: string) => void;
  onHora: (hora: string) => void;
  dias?: number;
}

export function Selector_Fecha_Hora({
  doctorId,
  fecha,
  hora,
  onFecha,
  onHora,
  dias = 30,
}: Props) {
  const fechas = useMemo(
    () => (doctorId ? fechasDeMedico(doctorId, dias) : []),
    [doctorId, dias],
  );
  const horarios = useMemo(
    () => (doctorId && fecha ? horariosDeMedico(doctorId, fecha) : []),
    [doctorId, fecha],
  );

  const fechasSet = useMemo(() => new Set(fechas), [fechas]);
  const seleccionada = fecha ? new Date(`${fecha}T00:00:00`) : undefined;

  function alElegirDia(dia?: Date) {
    if (!dia) return;
    const iso = fechaLocalISO(dia);
    if (!fechasSet.has(iso)) return;
    onFecha(iso);
    onHora("");
  }

  if (fechas.length === 0) {
    return (
      <div
        id="lista_horarios_vacia"
        className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground"
      >
        <Info className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          Este profesional no tiene fechas disponibles por ahora. Puedes intentar
          con otra sede o volver a revisar en otro momento.
        </p>
      </div>
    );
  }

  return (
    <div id="selector_fecha_hora" className="grid gap-4 sm:grid-cols-[auto_1fr]">
      <div className="rounded-xl border border-border bg-card p-1">
        <Calendar
          mode="single"
          selected={seleccionada}
          onSelect={alElegirDia}
          disabled={(d) => !fechasSet.has(fechaLocalISO(d))}
          defaultMonth={seleccionada ?? new Date(`${fechas[0]}T00:00:00`)}
          className="pointer-events-auto p-2"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Horario disponible
        </p>

        {!fecha && (
          <p className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
            Selecciona primero una fecha en el calendario.
          </p>
        )}

        {fecha && horarios.length === 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
            <CalendarOff className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>
              No quedan horarios libres el {formatearFechaLarga(fecha)}. Elige
              otro día del calendario.
            </p>
          </div>
        )}

        {fecha && horarios.length > 0 && (
          <Select value={hora} onValueChange={onHora}>
            <SelectTrigger id="lista_horarios" className="w-full">
              <SelectValue placeholder="Elige una hora" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {horarios.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {fecha && (
          <p className="text-xs text-muted-foreground">
            {horarios.length} horario{horarios.length !== 1 && "s"} libre
            {horarios.length !== 1 && "s"} para {formatearFechaLarga(fecha)}.
          </p>
        )}
      </div>
    </div>
  );
}
