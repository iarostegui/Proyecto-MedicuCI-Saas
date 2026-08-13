// ===== SOLID - SRP =====
// Única responsabilidad: utilidades HTTP (respuestas, errores, ruteo).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ErrorHttp } from "./seguridad.js";

export function json(res: VercelResponse, codigo: number, cuerpo: unknown): void {
  res.status(codigo).json(cuerpo);
}

/** Envoltura que traduce excepciones a respuestas seguras (OWASP A9). */
export async function manejar(
  res: VercelResponse,
  trabajo: () => Promise<unknown>,
): Promise<void> {
  try {
    const resultado = await trabajo();
    json(res, 200, resultado ?? { ok: true });
  } catch (error) {
    if (error instanceof ErrorHttp) {
      json(res, error.codigo, { error: error.message });
      return;
    }
    // No se filtran detalles internos (stack, SQL) al cliente.
    console.error("[api]", error);
    json(res, 500, { error: "Error interno del servidor" });
  }
}

export function cuerpo<T = Record<string, unknown>>(req: VercelRequest): T {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  return (req.body ?? {}) as T;
}

export function segmentos(req: VercelRequest): string[] {
  // 1. Si Vercel pasó el parámetro "ruta" mediante vercel.json
  const rutaParam = req.query["ruta"];
  if (Array.isArray(rutaParam)) return rutaParam;
  if (typeof rutaParam === "string") return rutaParam.split("/").filter(Boolean);

  // 2. Fallback: Parsear la URL limpia
  const urlSinQuery = (req.url ?? "").split("?")[0];
  const partes = urlSinQuery.split("/").filter(Boolean);

  // Elimina solo el primer 'api' si existe al inicio de la ruta
  if (partes[0] === "api") {
    partes.shift();
  }

  return partes; // Devuelve ["auth", "registro"] limpiamente
}
