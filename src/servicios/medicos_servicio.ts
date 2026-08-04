// SOLID - SRP
// Este servicio solo consulta médicos.
import { repositorios } from "@/repositorios/contenedor";
import type { MedicoRegistro, Sede } from "@/modelos";

// FUTURA CONEXIÓN MYSQL
// Aquí se reemplazarán los datos simulados por consultas SQL sobre `medicos`.

export function listar_medicos(): MedicoRegistro[] {
  return repositorios().medicos.listar();
}

export function medico_por_id(id: string): MedicoRegistro | undefined {
  return repositorios().medicos.buscarPorId(id);
}

export function medico_por_correo(correo: string): MedicoRegistro | undefined {
  return repositorios().medicos.buscarPorCorreo(correo);
}

export function medicos_por_sede(sede: Sede): MedicoRegistro[] {
  return repositorios().medicos.porSede(sede);
}
