// Utilidades de formato de fechas usadas en toda la interfaz.
export { formatearFechaLarga as formato_fecha_larga } from "@/logica/citas";
export { fechaLocalISO as fecha_local_iso, esFechaPasada as es_fecha_pasada } from "@/logica/disponibilidad";

export function formato_fecha_corta(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

export function formato_fecha_hora(iso: string): string {
  return new Date(iso).toLocaleString("es-ES");
}
