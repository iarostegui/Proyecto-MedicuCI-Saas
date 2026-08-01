// Configuración de disponibilidad por médico, persistida en LocalStorage.
import { obtenerMedicos } from "@/logica/autenticacion";
import { obtenerCitas } from "@/logica/citas";
import { DISPONIBILIDAD_INICIAL } from "@/datos/disponibilidad_inicial";

export interface Disponibilidad {
  doctorId: string;
  diasSemana: number[]; // 0=Dom … 6=Sab
  fechasBloqueadas: string[]; // YYYY-MM-DD
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  duracionMin: number; // duración por consulta
}

const CLAVE = "medicu:disponibilidad";

const DEFECTO: Omit<Disponibilidad, "doctorId"> = {
  diasSemana: [1, 2, 3, 4, 5],
  fechasBloqueadas: [],
  horaInicio: "08:00",
  horaFin: "17:00",
  duracionMin: 30,
};

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function leerTodo(): Record<string, Disponibilidad> {
  const s = store();
  if (!s) return {};
  try {
    return JSON.parse(s.getItem(CLAVE) || "{}") as Record<string, Disponibilidad>;
  } catch {
    return {};
  }
}

function escribirTodo(data: Record<string, Disponibilidad>) {
  const s = store();
  if (!s) return;
  s.setItem(CLAVE, JSON.stringify(data));
}

export function inicializarDisponibilidad() {
  const data = leerTodo();
  let cambio = false;
  for (const m of obtenerMedicos()) {
    if (!data[m.id]) {
      const semilla = DISPONIBILIDAD_INICIAL[m.id] ?? DEFECTO;
      data[m.id] = { doctorId: m.id, ...semilla };
      cambio = true;
    }
  }
  if (cambio) escribirTodo(data);
}

export function obtenerDisponibilidad(doctorId: string): Disponibilidad {
  const data = leerTodo();
  if (data[doctorId]) return data[doctorId];
  const semilla = DISPONIBILIDAD_INICIAL[doctorId] ?? DEFECTO;
  return { doctorId, ...semilla };
}

export function guardarDisponibilidad(d: Disponibilidad) {
  const data = leerTodo();
  data[d.doctorId] = d;
  escribirTodo(data);
}

// ===== INICIO MEJORA FUNCIONAL =====
// Mejora funcional 3 — Validación de fechas.
// Antes la agenda empezaba en "mañana" (i = 1). Ahora se incluye HOY siempre que
// queden horarios futuros, y NUNCA se ofrecen fechas anteriores a la actual.
/** Devuelve los próximos N días habilitados por la disponibilidad del médico. */
export function fechasDisponibles(doctorId: string, dias = 30): string[] {
  const disp = obtenerDisponibilidad(doctorId);
  const resultado: string[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  for (let i = 0; i <= dias; i++) {
    const d = new Date(hoy.getTime() + i * 86400000);
    const iso = fechaLocalISO(d);
    if (!disp.diasSemana.includes(d.getDay())) continue;
    if (disp.fechasBloqueadas.includes(iso)) continue;
    // Hoy solo se ofrece si aún queda al menos un horario libre en el futuro.
    if (i === 0 && slotsDisponibles(doctorId, iso).length === 0) continue;
    resultado.push(iso);
  }
  return resultado;
}

/** Fecha local en formato YYYY-MM-DD (evita el desfase de toISOString por UTC). */
export function fechaLocalISO(d: Date = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** ¿La fecha (YYYY-MM-DD) es anterior al día de hoy? */
export function esFechaPasada(fecha: string): boolean {
  return fecha < fechaLocalISO();
}
// ===== FIN MEJORA FUNCIONAL =====

/** Devuelve los slots libres (HH:mm) del médico en una fecha. */
export function slotsDisponibles(doctorId: string, fecha: string): string[] {
  const disp = obtenerDisponibilidad(doctorId);
  // ===== INICIO MEJORA FUNCIONAL =====
  // No se generan horarios para fechas ya pasadas.
  if (esFechaPasada(fecha)) return [];
  // ===== FIN MEJORA FUNCIONAL =====
  const [hi, mi] = disp.horaInicio.split(":").map(Number);
  const [hf, mf] = disp.horaFin.split(":").map(Number);
  const inicio = hi * 60 + mi;
  const fin = hf * 60 + mf;
  const slots: string[] = [];
  for (let t = inicio; t + disp.duracionMin <= fin; t += disp.duracionMin) {
    const hh = String(Math.floor(t / 60)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  // ===== INICIO MEJORA FUNCIONAL =====
  // Si la fecha es hoy, se descartan los horarios que ya pasaron.
  const hoyISO = fechaLocalISO();
  const ahora = new Date();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const vigentes =
    fecha === hoyISO
      ? slots.filter((s) => {
          const [h, m] = s.split(":").map(Number);
          return h * 60 + m > minutosAhora;
        })
      : slots;
  // ===== FIN MEJORA FUNCIONAL =====
  const ocupados = new Set(
    obtenerCitas()
      .filter((c) => c.doctorId === doctorId && c.fecha === fecha && c.estado !== "Cancelada")
      .map((c) => c.hora),
  );
  return vigentes.filter((s) => !ocupados.has(s));
}

/** ¿El médico tiene al menos un slot libre en los próximos N días? */
export function medicoTieneCupo(doctorId: string, dias = 30): boolean {
  for (const f of fechasDisponibles(doctorId, dias)) {
    if (slotsDisponibles(doctorId, f).length > 0) return true;
  }
  return false;
}

export const DIAS_SEMANA_ETIQUETAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
