// ===== INICIO OWASP A2 =====
// A2 — Fallos de autenticación: las contraseñas NUNCA se guardan en texto plano.
// Se usa BCrypt (bcryptjs) con sal aleatoria por usuario.
// Se incluye compatibilidad hacia atrás: los usuarios sembrados/registrados antes
// de esta mejora tenían la contraseña en claro; al comparar se detecta y se
// re-hashea de forma transparente.
//
// ===== INICIO SOLID - SRP =====
// Responsabilidad única: hashear y comparar contraseñas.
// ===== FIN SOLID - SRP =====
import bcrypt from "bcryptjs";
import { CONFIG } from "@/seguridad/configuracion";

const PREFIJOS_BCRYPT = ["$2a$", "$2b$", "$2y$"];

export function esHashBcrypt(valor: string): boolean {
  return PREFIJOS_BCRYPT.some((p) => valor.startsWith(p));
}

/** Genera el hash BCrypt de una contraseña en claro. */
export function hashearContrasena(contrasenaPlana: string): string {
  return bcrypt.hashSync(contrasenaPlana, CONFIG.rondasBcrypt);
}

/**
 * Compara una contraseña en claro con el valor almacenado.
 * Si el almacenado todavía es texto plano (datos legados), compara directo
 * e indica que debe migrarse a BCrypt.
 */
export function verificarContrasena(
  contrasenaPlana: string,
  almacenada: string,
): { valida: boolean; requiereMigracion: boolean } {
  if (esHashBcrypt(almacenada)) {
    return { valida: bcrypt.compareSync(contrasenaPlana, almacenada), requiereMigracion: false };
  }
  return { valida: contrasenaPlana === almacenada, requiereMigracion: true };
}
// ===== FIN OWASP A2 =====
