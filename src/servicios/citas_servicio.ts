// SOLID - SRP
// Este servicio solo administra citas.
// SOLID - DIP
// Depende de la interfaz del repositorio, no de una fuente de datos concreta.
import { repositorios } from "@/repositorios/contenedor";
import type { Cita } from "@/modelos";

// FUTURA CONEXIÓN MYSQL
// Aquí se reemplazarán los datos simulados por consultas SQL (SELECT/INSERT/UPDATE sobre `citas`).

export function listar_citas(): Cita[] {
  return repositorios().citas.listar();
}

export function citas_de_paciente(correo: string): Cita[] {
  return repositorios().citas.porPaciente(correo);
}

export function citas_de_medico(doctorId: string): Cita[] {
  return repositorios().citas.porDoctor(doctorId);
}

export function crear_cita(datos: Parameters<ReturnType<typeof repositorios>["citas"]["crear"]>[0]): Cita {
  return repositorios().citas.crear(datos);
}

export function cancelar_cita(codigo: string, motivo: string, detalle?: string) {
  return repositorios().citas.cancelar(codigo, motivo, detalle);
}

export function reprogramar_cita(codigo: string, fecha: string, hora: string) {
  return repositorios().citas.reprogramar(codigo, fecha, hora);
}
