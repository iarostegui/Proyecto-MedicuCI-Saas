// ===== INICIO OWASP A1 =====
// A1 — Validación de todas las entradas y prevención de inyección.
// Reglas centralizadas para DNI, correo, teléfono, fechas, motivos y búsquedas.
// Además se prohíbe explícitamente la concatenación de SQL: cuando el proyecto
// se conecte a MySQL deberá usarse SIEMPRE `consultaPreparada()` (placeholders `?`).
//
// ===== INICIO SOLID - SRP =====
// Responsabilidad única: validar entradas. No sanitiza HTML (ver sanitizacion.ts),
// no persiste, no renderiza.
// ===== FIN SOLID - SRP =====
import { z } from "zod";
import { sanitizarBusqueda, sanitizarTexto } from "@/seguridad/sanitizacion";

/** Resultado uniforme de validación (Liskov: todas las validaciones lo comparten). */
export interface ResultadoValidacion<T = string> {
  ok: boolean;
  valor?: T;
  error?: string;
}

const ok = <T>(valor: T): ResultadoValidacion<T> => ({ ok: true, valor });
const mal = <T>(error: string): ResultadoValidacion<T> => ({ ok: false, error });

// ---------- Esquemas Zod reutilizables ----------
export const esquemaDni = z
  .string()
  .trim()
  .regex(/^\d{8}$/, "El DNI debe tener exactamente 8 dígitos.");

export const esquemaCorreo = z
  .string()
  .trim()
  .max(120, "El correo es demasiado largo.")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Correo electrónico inválido.");

export const esquemaTelefono = z
  .string()
  .trim()
  .regex(/^9\d{8}$/, "El teléfono debe tener 9 dígitos y empezar con 9.");

export const esquemaFechaIso = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (AAAA-MM-DD).");

export const esquemaHora = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato de hora inválido (HH:mm).");

export const esquemaMotivo = z
  .string()
  .trim()
  .min(5, "El motivo debe tener al menos 5 caracteres.")
  .max(300, "El motivo es demasiado largo.");

// ---------- Validadores de alto nivel ----------
export function validarDniSeguro(valor: string): ResultadoValidacion {
  const r = esquemaDni.safeParse(valor);
  return r.success ? ok(r.data) : mal(r.error.issues[0]?.message ?? "DNI inválido.");
}

export function validarCorreoSeguro(valor: string): ResultadoValidacion {
  const r = esquemaCorreo.safeParse(valor);
  return r.success ? ok(r.data.toLowerCase()) : mal(r.error.issues[0]?.message ?? "Correo inválido.");
}

export function validarTelefonoSeguro(valor: string): ResultadoValidacion {
  const r = esquemaTelefono.safeParse(valor);
  return r.success ? ok(r.data) : mal(r.error.issues[0]?.message ?? "Teléfono inválido.");
}

export function validarFechaSeguro(valor: string): ResultadoValidacion {
  const r = esquemaFechaIso.safeParse(valor);
  if (!r.success) return mal(r.error.issues[0]?.message ?? "Fecha inválida.");
  const d = new Date(`${r.data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return mal("Fecha inválida.");
  return ok(r.data);
}

/** Motivo obligatorio: valida longitud y además sanitiza contra XSS. */
export function validarMotivoSeguro(valor: string, obligatorio = true): ResultadoValidacion {
  const limpio = sanitizarTexto(valor, 300);
  if (!limpio) {
    return obligatorio ? mal("El motivo es obligatorio.") : ok("");
  }
  const r = esquemaMotivo.safeParse(limpio);
  return r.success ? ok(r.data) : mal(r.error.issues[0]?.message ?? "Motivo inválido.");
}

/** Campo de búsqueda: siempre sanitizado, nunca concatenado en SQL. */
export function validarBusqueda(valor: string): string {
  return sanitizarBusqueda(valor, 80);
}

// ---------- Preparación para MySQL (Prepared Statements) ----------
export interface ConsultaPreparada {
  sql: string;
  parametros: unknown[];
}

/**
 * Única forma permitida de construir una consulta en el futuro backend MySQL.
 * Obliga a usar placeholders `?` y rechaza cualquier SQL con valores concatenados.
 *
 *   consultaPreparada("SELECT * FROM citas WHERE doctor_id = ?", [doctorId])
 */
export function consultaPreparada(sql: string, parametros: unknown[] = []): ConsultaPreparada {
  const placeholders = (sql.match(/\?/g) ?? []).length;
  if (placeholders !== parametros.length) {
    throw new Error("Consulta insegura: la cantidad de placeholders no coincide con los parámetros.");
  }
  if (/['"]\s*\+|\+\s*['"]|\$\{/.test(sql)) {
    throw new Error("Consulta insegura: no se permite concatenar valores en SQL.");
  }
  return { sql, parametros };
}
// ===== FIN OWASP A1 =====
