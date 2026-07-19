import jsPDF from "jspdf";
import type { Cita } from "@/logica/citas";

export function descargarComprobantePDF(cita: Cita) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFillColor(20, 138, 128);
  doc.rect(0, 0, ancho, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Medicu CI", 40, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Comprobante de cita médica", 40, 68);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);

  let y = 130;
  const linea = (etiqueta: string, valor: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(etiqueta, 40, y);
    doc.setFont("helvetica", "normal");
    doc.text(valor, 200, y);
    y += 22;
  };

  linea("Código:", cita.codigo);
  linea("Paciente:", cita.pacienteNombre);
  if (cita.pacienteDni) linea("DNI:", cita.pacienteDni);
  linea("Doctor:", cita.doctorNombre);
  linea("Especialidad:", cita.especialidad);
  linea("Sede:", cita.sede);
  linea("Fecha:", cita.fecha);
  linea("Hora:", cita.hora);
  linea("Estado:", cita.estado);
  linea("Creada:", new Date(cita.fechaCreacion).toLocaleString("es-ES"));
  if (cita.esUrgente) linea("Prioridad:", "URGENTE");
  if (cita.observaciones) linea("Observaciones:", cita.observaciones);
  if (cita.motivoCancelacion) linea("Motivo cancelación:", cita.motivoCancelacion);

  y += 20;
  doc.setDrawColor(200);
  doc.line(40, y, ancho - 40, y);
  y += 30;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "Presenta este comprobante en recepción 15 minutos antes de tu cita.",
    40,
    y,
  );

  doc.save(`comprobante_${cita.codigo}.pdf`);
}
