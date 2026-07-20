import { useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  Stethoscope,
  FileText,
  Download,
  X,
  CalendarClock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Insignia_Estado, Insignia_Urgente } from "@/components/Insignia_Estado";
import { descargarComprobantePDF } from "@/logica/comprobante";
import { cancelarCita, reprogramarCita, type Cita } from "@/logica/citas";
import { fechasDisponibles, slotsDisponibles } from "@/logica/disponibilidad";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ModoDetalle = "panel" | "historial";

interface Props {
  cita: Cita;
  abierto: boolean;
  onCerrar: () => void;
  onCambio?: () => void;
  /** "panel": paciente puede cancelar/reprogramar, sin badge de estado.
   *  "historial": sólo lectura + PDF, con badge de estado.
   *  Compat: `soloLectura` sigue funcionando como "historial". */
  modo?: ModoDetalle;
  soloLectura?: boolean;
}

export function Detalle_Cita({
  cita,
  abierto,
  onCerrar,
  onCambio,
  modo,
  soloLectura,
}: Props) {
  const modoEfectivo: ModoDetalle = modo ?? (soloLectura ? "historial" : "panel");
  const [pantalla, setPantalla] = useState<"detalle" | "cancelar" | "reprogramar">(
    "detalle",
  );
  const [motivo, setMotivo] = useState("");
  const [fechaNueva, setFechaNueva] = useState("");
  const [horaNueva, setHoraNueva] = useState("");

  const puedeGestionar =
    modoEfectivo === "panel" &&
    (cita.estado === "Programada" || cita.estado === "Reprogramada");

  const fechasReprog = useMemo(
    () => (pantalla === "reprogramar" ? fechasDisponibles(cita.doctorId, 30) : []),
    [pantalla, cita.doctorId],
  );
  const horasReprog = useMemo(
    () => (fechaNueva ? slotsDisponibles(cita.doctorId, fechaNueva) : []),
    [fechaNueva, cita.doctorId],
  );

  function cerrarTodo() {
    setPantalla("detalle");
    setMotivo("");
    setFechaNueva("");
    setHoraNueva("");
    onCerrar();
  }

  function confirmarCancelar() {
    cancelarCita(cita.codigo, "Cancelada por el paciente", motivo.trim() || undefined);
    toast.success("Cita cancelada", {
      description: `Se liberó el horario ${cita.hora} del ${cita.fecha}.`,
    });
    onCambio?.();
    cerrarTodo();
  }

  function confirmarReprogramar() {
    if (!fechaNueva || !horaNueva) {
      toast.error("Selecciona una nueva fecha y hora.");
      return;
    }
    const r = reprogramarCita(cita.codigo, fechaNueva, horaNueva);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Cita reprogramada", {
      description: `Nueva fecha: ${fechaNueva} a las ${horaNueva}.`,
    });
    onCambio?.();
    cerrarTodo();
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrarTodo()}>
      <DialogContent className="sm:max-w-lg">
        {pantalla === "detalle" && (
          <>
            <DialogHeader>
              {modoEfectivo === "historial" && (
                <div className="mb-1 flex items-center gap-2">
                  <Insignia_Estado estado={cita.estado} />
                  {cita.esUrgente && <Insignia_Urgente />}
                </div>
              )}
              {modoEfectivo === "panel" && cita.esUrgente && (
                <div className="mb-1">
                  <Insignia_Urgente />
                </div>
              )}
              <DialogTitle className="text-xl">{cita.especialidad}</DialogTitle>
              <DialogDescription>Código de cita: {cita.codigo}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <Fila icon={<Stethoscope className="size-4 text-primary" />} etiqueta="Doctor">
                {cita.doctorNombre}
              </Fila>
              <Fila icon={<CalendarDays className="size-4 text-primary" />} etiqueta="Fecha">
                {cita.fecha}
              </Fila>
              <Fila icon={<Clock className="size-4 text-primary" />} etiqueta="Hora">
                {cita.hora}
              </Fila>
              <Fila icon={<MapPin className="size-4 text-primary" />} etiqueta="Sede">
                {cita.sede}
              </Fila>
              <Fila icon={<FileText className="size-4 text-primary" />} etiqueta="Creada">
                {new Date(cita.fechaCreacion).toLocaleString("es-ES")}
              </Fila>
              {cita.pacienteNombre && (
                <Fila etiqueta="Paciente">{cita.pacienteNombre}</Fila>
              )}
              {cita.observaciones && (
                <Fila etiqueta="Observaciones">
                  <span className="whitespace-pre-line">{cita.observaciones}</span>
                </Fila>
              )}
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                onClick={() => descargarComprobantePDF(cita)}
                className="w-full sm:w-auto"
              >
                <Download className="size-4" />
                Descargar comprobante
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="ghost" onClick={cerrarTodo} className="w-full sm:w-auto">
                  Cerrar
                </Button>
                {puedeGestionar && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setPantalla("reprogramar")}
                      className="w-full sm:w-auto"
                    >
                      <CalendarClock className="size-4" />
                      Reprogramar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setPantalla("cancelar")}
                      className="w-full sm:w-auto"
                    >
                      <X className="size-4" />
                      Cancelar cita
                    </Button>
                  </>
                )}
              </div>
            </DialogFooter>
          </>
        )}

        {pantalla === "cancelar" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Cancelar cita</DialogTitle>
              <DialogDescription>
                Puedes indicar un motivo (opcional). Se guardará en las observaciones
                y el horario quedará liberado automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Motivo (opcional)
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Ej. Tengo un imprevisto laboral."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => setPantalla("detalle")}>
                Volver
              </Button>
              <Button variant="destructive" onClick={confirmarCancelar}>
                Confirmar cancelación
              </Button>
            </DialogFooter>
          </>
        )}

        {pantalla === "reprogramar" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Reprogramar cita</DialogTitle>
              <DialogDescription>
                Selecciona una nueva fecha y hora para {cita.doctorNombre}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nueva fecha
                </label>
                {fechasReprog.length === 0 ? (
                  <p className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
                    Este médico no tiene fechas disponibles próximamente.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {fechasReprog.slice(0, 12).map((f) => (
                      <button
                        key={f}
                        onClick={() => {
                          setFechaNueva(f);
                          setHoraNueva("");
                        }}
                        className={cn(
                          "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                          fechaNueva === f
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card hover:bg-secondary",
                        )}
                      >
                        {new Date(f + "T00:00:00").toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {fechaNueva && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nueva hora
                  </label>
                  {horasReprog.length === 0 ? (
                    <p className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
                      No quedan horarios libres en esa fecha.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {horasReprog.map((h) => (
                        <button
                          key={h}
                          onClick={() => setHoraNueva(h)}
                          className={cn(
                            "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                            horaNueva === h
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card hover:bg-secondary",
                          )}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => setPantalla("detalle")}>
                Volver
              </Button>
              <Button onClick={confirmarReprogramar} disabled={!fechaNueva || !horaNueva}>
                Confirmar reprogramación
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fila({
  icon,
  etiqueta,
  children,
}: {
  icon?: React.ReactNode;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-secondary/40 px-3 py-2">
      {icon && <span className="mt-0.5">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {etiqueta}
        </p>
        <p className="font-medium text-foreground">{children}</p>
      </div>
    </div>
  );
}
