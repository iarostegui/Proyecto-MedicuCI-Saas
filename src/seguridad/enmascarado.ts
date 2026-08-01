// ===== INICIO OWASP A3 =====
// A3 — Exposición de datos sensibles.
// El DNI, correo, teléfono y fecha de emisión se muestran parcialmente ocultos
// en cualquier interfaz. Las contraseñas jamás se almacenan ni muestran en claro.
//
// ===== INICIO SOLID - SRP =====
// Responsabilidad única: enmascarar datos para presentación.
// ===== FIN SOLID - SRP =====

/** 12345678 -> ****5678 */
export function enmascararDni(dni?: string | null): string {
  if (!dni) return "—";
  const limpio = dni.replace(/\D/g, "");
  if (limpio.length < 4) return "*".repeat(limpio.length);
  return "*".repeat(limpio.length - 4) + limpio.slice(-4);
}

/** juan.perez@correo.com -> ju****z@correo.com */
export function enmascararCorreo(correo?: string | null): string {
  if (!correo || !correo.includes("@")) return "—";
  const [usuario, dominio] = correo.split("@");
  if (usuario.length <= 2) return `${usuario[0] ?? "*"}***@${dominio}`;
  return `${usuario.slice(0, 2)}${"*".repeat(Math.max(3, usuario.length - 3))}${usuario.slice(-1)}@${dominio}`;
}

/** 987654321 -> *****4321 */
export function enmascararTelefono(telefono?: string | null): string {
  if (!telefono) return "—";
  const limpio = telefono.replace(/\D/g, "");
  if (limpio.length < 4) return "*".repeat(limpio.length);
  return "*".repeat(limpio.length - 4) + limpio.slice(-4);
}

/** 2019-04-23 se muestra ocultando día y mes, revelando solo el año. */
export function enmascararFechaEmision(fecha?: string | null): string {
  if (!fecha) return "—";
  const anio = fecha.slice(0, 4);
  return `**/**/${anio}`;
}
// ===== FIN OWASP A3 =====
