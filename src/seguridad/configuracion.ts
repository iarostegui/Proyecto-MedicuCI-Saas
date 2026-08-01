// ===== INICIO OWASP A6 =====
// A6 — Configuración segura.
// Centraliza la configuración sensible en variables de entorno (import.meta.env)
// con valores por defecto SOLO para el entorno de desarrollo/demo.
// Cuando el proyecto se conecte a MySQL, estas mismas claves se leerán del .env
// del servidor y NUNCA se escribirán en el código fuente.
//
// ===== INICIO SOLID - SRP =====
// Responsabilidad única: exponer configuración; no valida, no persiste, no renderiza.
// ===== FIN SOLID - SRP =====

interface ConfiguracionApp {
  readonly nombreApp: string;
  readonly entorno: "desarrollo" | "produccion";
  readonly esProduccion: boolean;
  /** Clave de firma del JWT (en producción debe venir del entorno). */
  readonly claveJwt: string;
  /** Vigencia del token de sesión en minutos. */
  readonly minutosExpiracionToken: number;
  /** Coste (rounds) de BCrypt. */
  readonly rondasBcrypt: number;
  /** Días hacia adelante que se ofrecen al agendar. */
  readonly diasAgendaVisibles: number;
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const CONFIG: ConfiguracionApp = {
  nombreApp: env["VITE_NOMBRE_APP"] ?? "Medicu CI",
  entorno: env["PROD"] ? "produccion" : "desarrollo",
  esProduccion: Boolean(env["PROD"]),
  claveJwt: env["VITE_CLAVE_JWT"] ?? "medicu-ci-clave-desarrollo-no-usar-en-produccion",
  minutosExpiracionToken: Number(env["VITE_MINUTOS_TOKEN"] ?? 60),
  rondasBcrypt: Number(env["VITE_RONDAS_BCRYPT"] ?? 10),
  diasAgendaVisibles: Number(env["VITE_DIAS_AGENDA"] ?? 21),
};

/**
 * Registro de diagnóstico: se silencia por completo en producción para no
 * filtrar detalles internos (stack traces, IDs, consultas) al usuario final.
 */
export function registrarDiagnostico(...datos: unknown[]): void {
  if (CONFIG.esProduccion) return;
  console.debug("[medicu]", ...datos);
}

/** Mensaje genérico para el usuario: nunca se muestran errores internos. */
export function mensajeErrorSeguro(fallback = "Ocurrió un error. Inténtalo nuevamente."): string {
  return fallback;
}
// ===== FIN OWASP A6 =====
