// ===== SOLID - SRP =====
// Única responsabilidad: utilidades HTTP (respuestas, errores, ruteo).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ErrorHttp } from "./seguridad.js";
import { obtenerErrorSistema, type CodigoErrorSistema } from "./catalogo_errores.js";

export function json(res: VercelResponse, codigo: number, cuerpo: unknown): void {
  res.status(codigo).json(cuerpo);
}

function errorBaseDatosSeguro(error: unknown): { codigo: CodigoErrorSistema; http: number; mensaje: string } | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { code?: string; errno?: number };
  let codigo: CodigoErrorSistema | null = null;

  switch (e.code) {
    case "ER_DUP_ENTRY":
      codigo = "BBDD-0001";
      break;
    case "ER_NO_REFERENCED_ROW_2":
    case "ER_ROW_IS_REFERENCED_2":
      codigo = "BBDD-0002";
      break;
    case "ER_BAD_NULL_ERROR":
    case "ER_DATA_TOO_LONG":
    case "ER_TRUNCATED_WRONG_VALUE":
      codigo = "BBDD-0003";
      break;
    case "ECONNREFUSED":
    case "PROTOCOL_CONNECTION_LOST":
      codigo = "BBDD-0004";
      break;
    default:
      if (e.errno === 1062) codigo = "BBDD-0001";
  }

  if (!codigo) return null;
  const definicion = obtenerErrorSistema(codigo);
  return { codigo, http: definicion.http, mensaje: definicion.mensaje };
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
      const codigoSistema = (error as ErrorHttp & { codigoSistema?: CodigoErrorSistema }).codigoSistema;
      json(res, error.codigo, {
        ...(codigoSistema ? { codigo: codigoSistema } : {}),
        error: error.message,
      });
      return;
    }

    const db = errorBaseDatosSeguro(error);
    if (db) {
      console.error("[api/db]", error);
      json(res, db.http, { codigo: db.codigo, error: db.mensaje });
      return;
    }

    // No se filtran detalles internos (stack, SQL) al cliente.
    console.error("[api]", error);
    const interno = obtenerErrorSistema("SIST-0001");
    json(res, interno.http, { codigo: interno.codigo, error: interno.mensaje });
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
