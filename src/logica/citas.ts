// Modelo de citas persistidas en LocalStorage bajo la clave `medicu:citas`.
import type { Sede } from "@/datos/sedes";

export type EstadoCita = "Programada" | "Reprogramada" | "Cancelada" | "Atendida";

export const ESTADOS_CITA: EstadoCita[] = [
  "Programada",
  "Reprogramada",
  "Cancelada",
  "Atendida",
];

export type MotivoCancelacion =
  | "Emergencia médica"
  | "Ausencia del médico"
  | "Reprogramación institucional"
  | "Otro";

export const MOTIVOS_CANCELACION: MotivoCancelacion[] = [
  "Emergencia médica",
  "Ausencia del médico",
  "Reprogramación institucional",
  "Otro",
];

export interface Cita {
  codigo: string;
  pacienteCorreo: string;
  pacienteNombre: string;
  pacienteDni?: string;
  doctorId: string;
  doctorNombre: string;
  especialidad: string;
  sede: Sede;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  estado: EstadoCita;
  esUrgente?: boolean;
  observaciones?: string;
  motivoCancelacion?: string;
  motivoCancelacionDetalle?: string;
  fechaCreacion: string; // ISO
}

const CLAVE_CITAS = "medicu:citas";
const CLAVE_CORRELATIVO = "medicu:correlativo";

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function obtenerCitas(): Cita[] {
  const s = store();
  if (!s) return [];
  try {
    return JSON.parse(s.getItem(CLAVE_CITAS) || "[]") as Cita[];
  } catch {
    return [];
  }
}

function guardarCitas(citas: Cita[]) {
  const s = store();
  if (!s) return;
  s.setItem(CLAVE_CITAS, JSON.stringify(citas));
}

export function generarCodigoCita(): string {
  const s = store();
  const anio = new Date().getFullYear();
  const claveAnio = `${CLAVE_CORRELATIVO}:${anio}`;
  let n = 1;
  if (s) {
    n = parseInt(s.getItem(claveAnio) || "0", 10) + 1;
    s.setItem(claveAnio, String(n));
  }
  return `CI-${anio}-${String(n).padStart(5, "0")}`;
}

export function crearCita(
  datos: Omit<Cita, "codigo" | "estado" | "fechaCreacion"> & { estado?: EstadoCita },
): Cita {
  const nueva: Cita = {
    ...datos,
    codigo: generarCodigoCita(),
    estado: datos.estado ?? "Programada",
    fechaCreacion: new Date().toISOString(),
  };
  const todas = obtenerCitas();
  todas.push(nueva);
  guardarCitas(todas);
  return nueva;
}

export function actualizarCita(codigo: string, cambios: Partial<Cita>): Cita | null {
  const todas = obtenerCitas();
  const idx = todas.findIndex((c) => c.codigo === codigo);
  if (idx < 0) return null;
  todas[idx] = { ...todas[idx], ...cambios };
  guardarCitas(todas);
  return todas[idx];
}

export function cancelarCita(
  codigo: string,
  motivo: string,
  detalle?: string,
): Cita | null {
  const todas = obtenerCitas();
  const actual = todas.find((c) => c.codigo === codigo);
  const nota = detalle?.trim()
    ? `Motivo de cancelación: ${motivo} — ${detalle.trim()}`
    : `Motivo de cancelación: ${motivo}`;
  const observaciones = actual?.observaciones
    ? `${actual.observaciones}\n${nota}`
    : nota;
  return actualizarCita(codigo, {
    estado: "Cancelada",
    motivoCancelacion: motivo,
    motivoCancelacionDetalle: detalle,
    observaciones,
  });
}

/** Reprograma una cita activa a una nueva fecha/hora. */
export function reprogramarCita(
  codigo: string,
  fecha: string,
  hora: string,
): { ok: true; cita: Cita } | { ok: false; error: string } {
  const todas = obtenerCitas();
  const actual = todas.find((c) => c.codigo === codigo);
  if (!actual) return { ok: false, error: "Cita no encontrada." };
  if (actual.estado === "Cancelada" || actual.estado === "Atendida") {
    return { ok: false, error: "Esta cita ya no puede reprogramarse." };
  }
  const ocupado = todas.some(
    (c) =>
      c.codigo !== codigo &&
      c.doctorId === actual.doctorId &&
      c.fecha === fecha &&
      c.hora === hora &&
      c.estado !== "Cancelada",
  );
  if (ocupado) return { ok: false, error: "Ese horario ya está ocupado." };
  const cita = actualizarCita(codigo, {
    fecha,
    hora,
    estado: "Reprogramada",
  });
  if (!cita) return { ok: false, error: "No se pudo reprogramar." };
  return { ok: true, cita };
}

export function citasDePaciente(correo: string): Cita[] {
  return obtenerCitas().filter(
    (c) => c.pacienteCorreo.toLowerCase() === correo.toLowerCase(),
  );
}

export function citasDeDoctor(doctorId: string): Cita[] {
  return obtenerCitas().filter((c) => c.doctorId === doctorId);
}

/** Está el slot ocupado por otra cita activa (no cancelada). */
export function slotOcupado(doctorId: string, fecha: string, hora: string): boolean {
  return obtenerCitas().some(
    (c) =>
      c.doctorId === doctorId &&
      c.fecha === fecha &&
      c.hora === hora &&
      c.estado !== "Cancelada",
  );
}

// ---------- Helpers de fecha ----------

export function formatearFechaLarga(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy.getTime() + 86400000);
  if (d.getTime() === hoy.getTime()) return "Hoy";
  if (d.getTime() === manana.getTime()) return "Mañana";
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function fechaCorta(iso: string): { dia: string; mes: string } {
  const d = new Date(iso + "T00:00:00");
  return {
    dia: d.toLocaleDateString("es-ES", { day: "2-digit" }),
    mes: d.toLocaleDateString("es-ES", { month: "short" }).replace(".", ""),
  };
}
