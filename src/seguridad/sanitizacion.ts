// ===== INICIO OWASP A7 =====
// A7 — Prevención de XSS (Cross-Site Scripting).
// Toda entrada libre del usuario (observaciones, motivos, perfil, búsquedas)
// pasa por estas funciones antes de almacenarse o mostrarse.
//
// ===== INICIO SOLID - SRP =====
// Responsabilidad única: limpiar texto. No valida reglas de negocio.
// ===== FIN SOLID - SRP =====

const MAPA_HTML: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#47;",
};

/** Escapa caracteres con significado en HTML. */
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"'/]/g, (c) => MAPA_HTML[c] ?? c);
}

/**
 * Sanitiza texto libre: elimina etiquetas, protocolos peligrosos y
 * manejadores de eventos, normaliza espacios y recorta la longitud.
 */
export function sanitizarTexto(entrada: unknown, maximo = 500): string {
  if (typeof entrada !== "string") return "";
  return entrada
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "") // ninguna etiqueta HTML sobrevive
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, maximo);
}

/** Sanitiza un término de búsqueda (además quita comodines SQL). */
export function sanitizarBusqueda(entrada: unknown, maximo = 80): string {
  return sanitizarTexto(entrada, maximo).replace(/[%_;'"\\]/g, "");
}
// ===== FIN OWASP A7 =====
