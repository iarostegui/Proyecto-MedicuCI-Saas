// ===== SOLID - SRP =====
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { VercelRequest } from "@vercel/node";
import { ejecutar } from "./db";

export type Rol = "Paciente" | "Medico" | "Admin";

export interface Sesion {
  idUsuario: number;
  correo: string;
  rol: Rol;
  idPaciente?: number;
  idMedico?: number;
}

const EXPIRACION = "8h";

function secreto(): string {
  const valor = process.env.JWT_SECRET;
  if (!valor) {
    // Evita crash no controlado si la variable no está en Vercel
    console.error("CRÍTICO: JWT_SECRET no está configurado en las variables de entorno");
    return "clave_fallback_desarrollo_secreta_2026"; 
  }
  return valor;
}

export async function hashearContrasena(plana: string): Promise<string> {
  return await bcrypt.hash(plana, 10);
}

export async function verificarContrasena(plana: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plana, hash);
}

export function firmarToken(sesion: Sesion): string {
  return jwt.sign(sesion, secreto(), { algorithm: "HS256", expiresIn: EXPIRACION });
}

export function leerSesion(req: VercelRequest): Sesion | null {
  const cabecera = req.headers.authorization;
  if (!cabecera?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(cabecera.slice(7), secreto()) as Sesion;
  } catch {
    return null;
  }
}

/** Lanza 401/403 si no hay sesión válida o el rol no está permitido. */
export function exigirSesion(req: VercelRequest, roles?: Rol[]): Sesion {
  const sesion = leerSesion(req);
  if (!sesion) throw new ErrorHttp(401, "No autenticado");
  if (roles && !roles.includes(sesion.rol)) throw new ErrorHttp(403, "Acceso denegado");
  return sesion;
}

export class ErrorHttp extends Error {
  constructor(
    public codigo: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** OWASP A7 — limpia texto libre antes de persistir. */
export function sanitizar(entrada: unknown, maximo = 500): string {
  if (typeof entrada !== "string") return "";
  return entrada
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim()
    .slice(0, maximo);
}

/** OWASP A10 — deja rastro de las acciones importantes. */
export async function auditar(
  usuario: string,
  accion: string,
  detalle?: string,
  ip?: string,
): Promise<void> {
  try {
    await ejecutar(
      "INSERT INTO auditoria (usuario, accion, detalle, ip) VALUES (?, ?, ?, ?)",
      [usuario, accion, detalle ?? null, ip ?? null],
    );
  } catch {
    /* la auditoría nunca debe romper la operación principal */
  }
}
