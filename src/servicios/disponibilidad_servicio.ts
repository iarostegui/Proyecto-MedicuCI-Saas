// SOLID - ISP
// Servicio específico para disponibilidad.
import { repositorios } from "@/repositorios/contenedor";
import type { Disponibilidad } from "@/modelos";

// FUTURA CONEXIÓN MYSQL
// Aquí se reemplazarán los datos simulados por consultas SQL sobre `disponibilidad`.

export function obtener_disponibilidad(doctorId: string): Disponibilidad {
  return repositorios().disponibilidad.obtener(doctorId);
}

export function guardar_disponibilidad(disponibilidad: Disponibilidad): void {
  repositorios().disponibilidad.guardar(disponibilidad);
}

export function fechas_libres(doctorId: string, dias?: number): string[] {
  return repositorios().disponibilidad.fechasLibres(doctorId, dias);
}

export function horarios_libres(doctorId: string, fecha: string): string[] {
  return repositorios().disponibilidad.horariosLibres(doctorId, fecha);
}
