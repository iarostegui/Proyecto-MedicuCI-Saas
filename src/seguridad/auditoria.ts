// ===== INICIO OWASP A10 =====
// A10 — Registro y monitoreo (auditoría).
// Guarda un rastro básico de acciones críticas: usuario, fecha, hora y acción.
// Persistido hoy en LocalStorage; mañana bastará con cambiar la implementación
// del repositorio para escribir en la tabla MySQL `auditoria`.
//
// ===== INICIO SOLID - SRP =====
// Responsabilidad única: registrar y consultar eventos de auditoría.
// ===== FIN SOLID - SRP =====

export type AccionAuditada =
  | "INICIO_SESION"
  | "CIERRE_SESION"
  | "REGISTRO_USUARIO"
  | "CREACION_CITA"
  | "CANCELACION_CITA"
  | "REPROGRAMACION_CITA"
  | "ERROR_AUTENTICACION"
  | "ACCESO_DENEGADO"
  | "CAMBIO_DISPONIBILIDAD"
  | "ESTADO_AUTOMATICO";

export interface RegistroAuditoria {
  id: string;
  usuario: string;
  accion: AccionAuditada;
  detalle?: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm:ss
  marcaTiempo: string; // ISO completo
}

const CLAVE = "medicu:auditoria";
const MAXIMO = 500;

function almacen(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function registrarAuditoria(
  usuario: string,
  accion: AccionAuditada,
  detalle?: string,
): void {
  const s = almacen();
  if (!s) return;
  const ahora = new Date();
  const registro: RegistroAuditoria = {
    id: `aud_${ahora.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    usuario: usuario || "anónimo",
    accion,
    detalle,
    fecha: ahora.toISOString().slice(0, 10),
    hora: ahora.toTimeString().slice(0, 8),
    marcaTiempo: ahora.toISOString(),
  };
  const previos = listarAuditoria();
  previos.unshift(registro);
  s.setItem(CLAVE, JSON.stringify(previos.slice(0, MAXIMO)));
}

export function listarAuditoria(): RegistroAuditoria[] {
  const s = almacen();
  if (!s) return [];
  try {
    return JSON.parse(s.getItem(CLAVE) || "[]") as RegistroAuditoria[];
  } catch {
    return [];
  }
}

export function limpiarAuditoria(): void {
  almacen()?.removeItem(CLAVE);
}
// ===== FIN OWASP A10 =====
