// ===== SOLID - SRP =====
// Única responsabilidad: decidir de DÓNDE salen los datos en tiempo de ejecución.
// - "api"   → backend Node en Vercel conectado a MySQL (Aiven).
// - "local" → almacenamiento local (vista previa de Lovable, sin acceso TCP a MySQL).
//
// ===== SOLID - OCP / DIP =====
// Las pantallas dependen de la fachada (`fachada_datos`), nunca de esta decisión.
// Añadir un nuevo origen no obliga a tocar la interfaz.

export type OrigenDatos = "api" | "local";

const CLAVE_CACHE = "medicu:origen_datos";
let promesa: Promise<OrigenDatos> | null = null;
let resuelto: OrigenDatos | null = null;

/** Origen ya conocido (sin esperar). Por defecto "local". */
export function origenActual(): OrigenDatos {
  if (resuelto) return resuelto;
  if (typeof window !== "undefined") {
    const guardado = window.sessionStorage.getItem(CLAVE_CACHE);
    if (guardado === "api" || guardado === "local") {
      resuelto = guardado;
      return guardado;
    }
  }
  return "local";
}

/** Detecta una sola vez si `/api/salud` responde; cachea el resultado. */
export function detectarOrigen(): Promise<OrigenDatos> {
  if (resuelto) return Promise.resolve(resuelto);
  if (typeof window === "undefined") return Promise.resolve("local");
  if (promesa) return promesa;

  promesa = (async () => {
    let origen: OrigenDatos = "local";
    try {
      const control = new AbortController();
      const tiempo = setTimeout(() => control.abort(), 3500);
      const respuesta = await fetch("/api/salud", { signal: control.signal });
      clearTimeout(tiempo);
      if (respuesta.ok) {
        const cuerpo = (await respuesta.json().catch(() => ({}))) as { ok?: boolean };
        if (cuerpo.ok) origen = "api";
      }
    } catch {
      origen = "local";
    }
    resuelto = origen;
    window.sessionStorage.setItem(CLAVE_CACHE, origen);
    return origen;
  })();

  return promesa;
}

export async function usandoApi(): Promise<boolean> {
  return (await detectarOrigen()) === "api";
}

/** Sólo para pruebas o para forzar un origen desde la consola. */
export function forzarOrigen(origen: OrigenDatos): void {
  resuelto = origen;
  promesa = Promise.resolve(origen);
  if (typeof window !== "undefined") window.sessionStorage.setItem(CLAVE_CACHE, origen);
}
