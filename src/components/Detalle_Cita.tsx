import { useState } from "react";
import { CalendarDays, Clock, MapPin, Stethoscope, FileText, Download, X } from "lucide-react";
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
import { cancelarCita, type Cita } from "@/logica/citas";
import { toast } from "sonner";

interface Props {
  cita: Cita;
  abierto: boolean;
  onCerrar: () => void;
  onCambio?: () => void;
  soloLectura?: boolean;
}

export function Detalle_Cita({ cita, abierto, onCerrar, onCambio, soloLectura }: Props) {
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);

  function cancelar() {
    cancelarCita(cita.codigo, "Cancelada por el paciente");
    toast.success("Cita cancelada", {
      description: `Se liberó el horario ${cita.hora} del ${cita.fecha}.`,
    });
    setConfirmandoCancelar(false);
    onCambio?.();
    onCerrar();
  }

  const puedeCancelar =
    !soloLectura && (cita.estado === "Programada" || cita.estado === "Reprogramada");

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <Insignia_Estado estado={cita.estado} />
            {cita.esUrgente && <Insignia_Urgente />}
          </div>
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
            <Fila etiqueta="Observaciones">{cita.observaciones}</Fila>
          )}
          {cita.motivoCancelacion && (
            <Fila etiqueta="Motivo de cancelación">
              {cita.motivoCancelacion}
              {cita.motivoCancelacionDetalle ? ` — ${cita.motivoCancelacionDetalle}` : ""}
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
            <Button variant="ghost" onClick={onCerrar} className="w-full sm:w-auto">
              Cerrar
            </Button>
            {puedeCancelar &&
              (confirmandoCancelar ? (
                <Button
                  variant="destructive"
                  onClick={cancelar}
                  className="w-full sm:w-auto"
                >
                  <X className="size-4" />
                  Confirmar cancelación
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => setConfirmandoCancelar(true)}
                  className="w-full sm:w-auto"
                >
                  Cancelar cita
                </Button>
              ))}
          </div>
        </DialogFooter>
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
