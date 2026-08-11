import { useState } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  Stethoscope,
  FileText,
  Download,
  X,
  CalendarClock,
  ClipboardCheck,
  NotebookPen,
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
import { Selector_Fecha_Hora } from "@/components/Selector_Fecha_Hora";

import { descargarComprobantePDF } from "@/servicios/servicio_exportacion";
import { registrarAtencion, type Cita } from "@/servicios/servicio_citas";
// ===== SOLID - DIP =====
// Cancelar y reprogramar pasan por la fachada (API MySQL o almacén local).
import { actorActual, cancelar, reprogramar } from "@/servicios/fachada_datos";
import { obtenerSesion } from "@/servicios/servicio_sesion";
import { toast } from "sonner";

export type ModoDetalle = "panel" | "historial" | "medico";

interface Props {
  cita: Cita;
  abierto: boolean;
  onCerrar: () => void;
  onCambio?: () => void;
  /** "panel": paciente puede cancelar/reprogramar, sin badge de estado.
   *  "historial": sólo lectura + PDF, con badge de estado.
   *  "medico": médico puede registrar atención (nota clínica).
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
  const [pantalla, setPantalla] = useState<
    "detalle" | "cancelar" | "reprogramar" | "atender"
  >("detalle");
  const [motivo, setMotivo] = useState("");
  const [fechaNueva, setFechaNueva] = useState("");
  const [horaNueva, setHoraNueva] = useState("");

  // Nota clínica (modo médico)
  const [diagnostico, setDiagnostico] = useState(cita.notaClinica?.diagnostico ?? "");
  const [tratamiento, setTratamiento] = useState(cita.notaClinica?.tratamiento ?? "");
  const [obsNota, setObsNota] = useState(cita.notaClinica?.observaciones ?? "");

  const puedeGestionar =
    modoEfectivo === "panel" &&
    (cita.estado === "Programada" || cita.estado === "Reprogramada");
  const puedeAtender =
    modoEfectivo === "medico" &&
    (cita.estado === "Programada" || cita.estado === "Reprogramada");
  const puedeCancelarMedico =
    modoEfectivo === "medico" &&
    (cita.estado === "Programada" || cita.estado === "Reprogramada");
  const mostrarEstado = modoEfectivo === "historial" || modoEfectivo === "medico";


  function cerrarTodo() {
    setPantalla("detalle");
    setMotivo("");
    setFechaNueva("");
    setHoraNueva("");
    onCerrar();
  }

  async function confirmarCancelar() {
    const esMedico = modoEfectivo === "medico";
    if (esMedico && !motivo.trim()) {
      toast.error("El motivo de cancelación es obligatorio.");
      return;
    }
    const actor = actorActual();
    if (!actor) {
      toast.error("Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }
    const r = await cancelar(actor, cita.codigo, motivo.trim());
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo cancelar la cita.");
      return;
    }
    toast.success("Cita cancelada", {
      description: `Se liberó el horario ${cita.hora} del ${cita.fecha}.`,
    });
    onCambio?.();
    cerrarTodo();
  }


  async function confirmarReprogramar() {
    if (!fechaNueva || !horaNueva) {
      toast.error("Selecciona una nueva fecha y hora.");
      return;
    }
    const actor = actorActual();
    if (!actor) {
      toast.error("Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }
    const r = await reprogramar(actor, cita.codigo, fechaNueva, horaNueva);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo reprogramar la cita.");
      return;
    }
    toast.success("Cita reprogramada", {
      description: `Nueva fecha: ${fechaNueva} a las ${horaNueva}.`,
    });
    onCambio?.();
    cerrarTodo();
  }

  function confirmarAtencion() {
    if (!diagnostico.trim() || !tratamiento.trim()) {
      toast.error("Diagnóstico y tratamiento son obligatorios.");
      return;
    }
    const sesion = obtenerSesion();
    registrarAtencion(cita.codigo, {
      diagnostico: diagnostico.trim(),
      tratamiento: tratamiento.trim(),
      observaciones: obsNota.trim() || undefined,
      registradaPor: sesion?.correo ?? "medico",
    });
    toast.success("Atención registrada", {
      description: "La cita quedó marcada como atendida.",
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
              {mostrarEstado && (
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
              {cita.notaClinica && (
                <div className="rounded-lg border border-primary/30 bg-primary-soft/40 px-3 py-2">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    <NotebookPen className="size-3.5" /> Nota clínica
                  </p>
                  <p className="text-sm"><b>Diagnóstico:</b> {cita.notaClinica.diagnostico}</p>
                  <p className="text-sm"><b>Tratamiento:</b> {cita.notaClinica.tratamiento}</p>
                  {cita.notaClinica.observaciones && (
                    <p className="text-sm whitespace-pre-line">
                      <b>Observaciones:</b> {cita.notaClinica.observaciones}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Registrada el {new Date(cita.notaClinica.registradaEn).toLocaleString("es-ES")}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter
              id="pie_detalle_cita"
              className="mt-2 grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <Button
                variant="outline"
                onClick={() => descargarComprobantePDF(cita)}
                className="w-full min-w-0"
              >
                <Download className="size-4" />
                Descargar
              </Button>
              <Button variant="ghost" onClick={cerrarTodo} className="w-full min-w-0">
                Cerrar
              </Button>
              {puedeGestionar && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setPantalla("reprogramar")}
                    className="w-full min-w-0"
                  >
                    <CalendarClock className="size-4" />
                    Reprogramar
                  </Button>
                  <Button
                    id="boton_cancelar"
                    variant="destructive"
                    onClick={() => setPantalla("cancelar")}
                    className="w-full min-w-0"
                  >
                    <X className="size-4" />
                    Cancelar cita
                  </Button>
                </>
              )}
              {puedeAtender && (
                <Button onClick={() => setPantalla("atender")} className="w-full min-w-0">
                  <ClipboardCheck className="size-4" />
                  Registrar atención
                </Button>
              )}
              {puedeCancelarMedico && (
                <Button
                  id="boton_cancelar"
                  variant="destructive"
                  onClick={() => setPantalla("cancelar")}
                  className="w-full min-w-0"
                >
                  <X className="size-4" />
                  Cancelar cita
                </Button>
              )}
            </DialogFooter>

          </>
        )}


        {pantalla === "cancelar" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Cancelar cita</DialogTitle>
              <DialogDescription>
                {modoEfectivo === "medico"
                  ? "El motivo de cancelación es obligatorio. Se guardará en las observaciones visibles para el paciente y el horario quedará liberado automáticamente."
                  : "Puedes indicar un motivo (opcional). Se guardará en las observaciones y el horario quedará liberado automáticamente."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Motivo {modoEfectivo === "medico" ? "*" : "(opcional)"}
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder={
                  modoEfectivo === "medico"
                    ? "Ej. Emergencia médica del profesional."
                    : "Ej. Tengo un imprevisto laboral."
                }
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => setPantalla("detalle")}>
                Volver
              </Button>
              <Button variant="destructive" onClick={() => void confirmarCancelar()}>
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

            <div className="py-2">
              <Selector_Fecha_Hora
                doctorId={cita.doctorId}
                fecha={fechaNueva}
                hora={horaNueva}
                onFecha={setFechaNueva}
                onHora={setHoraNueva}
              />
            </div>


            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => setPantalla("detalle")}>
                Volver
              </Button>
              <Button onClick={() => void confirmarReprogramar()} disabled={!fechaNueva || !horaNueva}>
                Confirmar reprogramación
              </Button>
            </DialogFooter>
          </>
        )}

        {pantalla === "atender" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Registrar atención</DialogTitle>
              <DialogDescription>
                La cita se marcará como <b>Atendida</b> y la nota quedará en la historia clínica del paciente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Diagnóstico *
                </span>
                <textarea
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background p-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Tratamiento *
                </span>
                <textarea
                  value={tratamiento}
                  onChange={(e) => setTratamiento(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background p-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Observaciones (opcional)
                </span>
                <textarea
                  value={obsNota}
                  onChange={(e) => setObsNota(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background p-2 text-sm"
                />
              </label>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => setPantalla("detalle")}>
                Volver
              </Button>
              <Button onClick={confirmarAtencion}>
                <ClipboardCheck className="size-4" /> Guardar y marcar atendida
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
