// Capa de abstracción de médicos y especialidades. Pensada para que un
// futuro panel administrativo (u otro origen de datos) sólo tenga que
// consumir estas funciones, sin tocar la UI.
import { obtenerMedicos } from "@/logica/autenticacion";
import type { MedicoRegistro } from "@/datos/medicos_iniciales";
import type { Sede } from "@/datos/sedes";

export function listarMedicos(): MedicoRegistro[] {
  return obtenerMedicos();
}

export function buscarMedicoPorId(id: string): MedicoRegistro | undefined {
  return listarMedicos().find((m) => m.id === id);
}

export function listarEspecialidades(): string[] {
  return Array.from(new Set(listarMedicos().map((m) => m.especialidad))).sort();
}

export function medicosPorEspecialidadYSede(
  especialidad: string,
  sede: Sede,
): MedicoRegistro[] {
  return listarMedicos().filter(
    (m) => m.especialidad === especialidad && m.sede === sede,
  );
}

export function medicosPorEspecialidad(especialidad: string): MedicoRegistro[] {
  return listarMedicos().filter((m) => m.especialidad === especialidad);
}
