// ===== INICIO SOLID - SRP =====
// SERVICIO DE AGENDA: única responsabilidad = resolver qué sedes, especialidades,
// médicos, fechas y horarios están realmente disponibles para agendar.
// ===== FIN SOLID - SRP =====
//
// ===== INICIO SOLID - DIP =====
// Los componentes consumen este servicio y no la lógica de LocalStorage.
// ===== FIN SOLID - DIP =====
import { repositorios } from "@/repositorios/contenedor";
import {
  especialidadesDisponiblesEnSede,
  medicosDisponibles,
} from "@/logica/medicos";
import type { MedicoRegistro, Sede } from "@/modelos";
import { CONFIG } from "@/seguridad/configuracion";

export function especialidadesDeSede(sede: Sede): string[] {
  return especialidadesDisponiblesEnSede(sede);
}

export function medicosDeEspecialidad(especialidad: string, sede: Sede): MedicoRegistro[] {
  return medicosDisponibles(especialidad, sede);
}

export function fechasDeMedico(doctorId: string, dias = CONFIG.diasAgendaVisibles): string[] {
  return repositorios().disponibilidad.fechasLibres(doctorId, dias);
}

export function horariosDeMedico(doctorId: string, fecha: string): string[] {
  return repositorios().disponibilidad.horariosLibres(doctorId, fecha);
}

export function obtenerAgendaMedico(doctorId: string) {
  return repositorios().disponibilidad.obtener(doctorId);
}

export function guardarAgendaMedico(disponibilidad: ReturnType<typeof obtenerAgendaMedico>) {
  repositorios().disponibilidad.guardar(disponibilidad);
}
