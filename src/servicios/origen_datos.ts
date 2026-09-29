// ===== SOLID - SRP =====
// Única responsabilidad: decidir de DÓNDE salen los datos.
//
// Política:
// - "api"   → modo normal de la aplicación. Es el valor por defecto.
// - "local" → SOLO para prototipos visuales/funcionales sin backend.
//             Debe habilitarse explícitamente con VITE_MODO_PROTOTIPO_LOCAL=true.
//
// En una implementación real NO se hace fallback automático a local si la API
// falla. Un fallo de API/backend debe quedar visible para poder corregirlo.

export type OrigenDatos = "api" | "local";

const env =
  (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env ?? {};

const MODO_PROTOTIPO_LOCAL =
  String(env["VITE_MODO_PROTOTIPO_LOCAL"] ?? "").toLowerCase() === "true";

let origenForzado: OrigenDatos | null = null;

/** Origen configurado. API es siempre el valor por defecto. */
export function origenActual(): OrigenDatos {
  if (origenForzado) return origenForzado;
  return MODO_PROTOTIPO_LOCAL ? "local" : "api";
}

/**
 * Mantiene la interfaz asíncrona histórica.
 * Ya no prueba /api/salud para decidir el origen: una caída de API no autoriza
 * a cambiar silenciosamente a almacenamiento local.
 */
export function detectarOrigen(): Promise<OrigenDatos> {
  return Promise.resolve(origenActual());
}

export async function usandoApi(): Promise<boolean> {
  return (await detectarOrigen()) === "api";
}

/**
 * Sólo para pruebas automatizadas.
 * No permite forzar almacenamiento local salvo que el build haya sido creado
 * explícitamente en modo prototipo.
 */
export function forzarOrigen(origen: OrigenDatos): void {
  if (origen === "local" && !MODO_PROTOTIPO_LOCAL) {
    throw new Error(
      "El almacenamiento local está deshabilitado. Use VITE_MODO_PROTOTIPO_LOCAL=true sólo para prototipos.",
    );
  }
  origenForzado = origen;
}
