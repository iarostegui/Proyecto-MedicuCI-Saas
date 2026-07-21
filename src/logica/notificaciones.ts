// Notificaciones derivadas del estado real de las citas.
// Cada notificación se marca leída persistiendo su id por usuario en LocalStorage.
import { citasDeDoctor, citasDePaciente, obtenerCitas, type Cita } from "@/logica/citas";
import { buscarMedicoPorCorreo, type RolUsuario } from "@/logica/autenticacion";

export type TipoNotificacion =
  | "recordatorio"
  | "cancelada"
  | "reprogramada"
  | "urgente"
  | "atendida";

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  detalle: string;
  fechaOrden: string; // ISO para ordenar (más reciente primero)
  cita?: Cita;
}

const CLAVE_LEIDAS = "medicu:notif_leidas";

function claveUsuario(correo: string) {
  return `${CLAVE_LEIDAS}:${correo.toLowerCase()}`;
}

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function leidasDe(correo: string): Set<string> {
  const s = store();
  if (!s) return new Set();
  try {
    return new Set(JSON.parse(s.getItem(claveUsuario(correo)) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function marcarLeidas(correo: string, ids: string[]) {
  const s = store();
  if (!s) return;
  const set = leidasDe(correo);
  ids.forEach((id) => set.add(id));
  s.setItem(claveUsuario(correo), JSON.stringify([...set]));
}

function esFuturaCercana(c: Cita): boolean {
  if (c.estado !== "Programada" && c.estado !== "Reprogramada") return false;
  const cita = new Date(`${c.fecha}T${c.hora}:00`);
  const ahora = new Date();
  const dif = cita.getTime() - ahora.getTime();
  return dif > 0 && dif <= 48 * 3600 * 1000;
}

/** Genera la lista de notificaciones para el usuario según su rol. */
export function notificacionesDe(
  correo: string,
  rol: RolUsuario,
): Notificacion[] {
  let citas: Cita[] = [];
  if (rol === "Paciente") citas = citasDePaciente(correo);
  else if (rol === "Medico") {
    const med = buscarMedicoPorCorreo(correo);
    if (med) citas = citasDeDoctor(med.id);
  } else citas = obtenerCitas();

  const items: Notificacion[] = [];
  for (const c of citas) {
    if (esFuturaCercana(c)) {
      items.push({
        id: `${c.codigo}:recordatorio:${c.fecha}${c.hora}`,
        tipo: c.esUrgente ? "urgente" : "recordatorio",
        titulo: c.esUrgente ? "Cita urgente próxima" : "Recordatorio de cita",
        detalle: `${c.especialidad} · ${c.fecha} ${c.hora} · ${c.doctorNombre}`,
        fechaOrden: `${c.fecha}T${c.hora}`,
        cita: c,
      });
    }
    if (c.estado === "Cancelada" && c.motivoCancelacion) {
      items.push({
        id: `${c.codigo}:cancelada`,
        tipo: "cancelada",
        titulo: "Cita cancelada",
        detalle: `${c.especialidad} · ${c.fecha} ${c.hora} — ${c.motivoCancelacion}`,
        fechaOrden: c.fechaCreacion,
        cita: c,
      });
    }
    if (c.estado === "Reprogramada") {
      items.push({
        id: `${c.codigo}:reprogramada:${c.fecha}${c.hora}`,
        tipo: "reprogramada",
        titulo: "Cita reprogramada",
        detalle: `Nueva fecha ${c.fecha} a las ${c.hora} · ${c.doctorNombre}`,
        fechaOrden: `${c.fecha}T${c.hora}`,
        cita: c,
      });
    }
    if (rol === "Paciente" && c.estado === "Atendida" && c.notaClinica) {
      items.push({
        id: `${c.codigo}:atendida`,
        tipo: "atendida",
        titulo: "Nueva nota clínica",
        detalle: `${c.especialidad} · ${c.doctorNombre} registró tu atención.`,
        fechaOrden: c.notaClinica.registradaEn,
        cita: c,
      });
    }
  }
  return items.sort((a, b) => b.fechaOrden.localeCompare(a.fechaOrden));
}

export function contarNoLeidas(correo: string, rol: RolUsuario): number {
  const leidas = leidasDe(correo);
  return notificacionesDe(correo, rol).filter((n) => !leidas.has(n.id)).length;
}
