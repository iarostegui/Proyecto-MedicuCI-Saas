// ===== INICIO OWASP A5 =====
// A5 — Control de acceso roto.
// Reglas centralizadas de autorización por rol y de propiedad del recurso.
// El paciente sólo accede a SUS datos; el médico sólo a SUS citas y agenda.
// Estas mismas funciones deberán invocarse en el backend MySQL (misma firma),
// para que el control exista en frontend Y backend.
//
// ===== INICIO SOLID - SRP =====
// Responsabilidad única: decidir si un actor puede acceder a un recurso.
// ===== FIN SOLID - SRP =====
import type { RolUsuario } from "@/logica/autenticacion";
import { registrarAuditoria } from "@/seguridad/auditoria";

export interface ActorAutenticado {
  correo: string;
  rol: RolUsuario;
  /** Id del médico cuando el rol es "Medico". */
  medicoId?: string;
}

/** Rutas permitidas por rol (Open/Closed: se amplía agregando entradas). */
const RUTAS_POR_ROL: Record<RolUsuario, string[]> = {
  Paciente: ["/panel_principal", "/historial_citas"],
  Medico: ["/panel_medico", "/disponibilidad_medico", "/reportes"],
  Admin: ["/panel_admin", "/reportes"],
};

export function puedeAccederRuta(rol: RolUsuario | undefined, ruta: string): boolean {
  if (!rol) return false;
  return RUTAS_POR_ROL[rol].some((r) => ruta.startsWith(r));
}

/** El paciente sólo puede leer/modificar recursos cuyo correo coincide con el suyo. */
export function esDuenoDelRecurso(actor: ActorAutenticado, correoRecurso: string): boolean {
  return actor.correo.toLowerCase() === correoRecurso.toLowerCase();
}

/** El médico sólo puede operar sobre citas cuyo doctorId sea el suyo. */
export function esMedicoDeLaCita(actor: ActorAutenticado, doctorId: string): boolean {
  return actor.rol === "Medico" && actor.medicoId === doctorId;
}

/** Verificación con registro de auditoría cuando se deniega el acceso. */
export function autorizar(
  actor: ActorAutenticado | null,
  condicion: boolean,
  detalle: string,
): boolean {
  if (!condicion) {
    registrarAuditoria(actor?.correo ?? "anónimo", "ACCESO_DENEGADO", detalle);
    return false;
  }
  return true;
}
// ===== FIN OWASP A5 =====
