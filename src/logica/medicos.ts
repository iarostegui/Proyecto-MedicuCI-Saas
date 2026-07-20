// Capa de abstracción de médicos y especialidades. Filtros por sede,
// especialidad y disponibilidad real de cupos.
import { obtenerMedicos } from "@/logica/autenticacion";
import { medicoTieneCupo } from "@/logica/disponibilidad";
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

export function medicosPorSede(sede: Sede): MedicoRegistro[] {
  return listarMedicos().filter((m) => m.sede === sede);
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

/** Especialidades ofrecidas en una sede que tienen al menos un médico con cupo. */
export function especialidadesDisponiblesEnSede(sede: Sede): string[] {
  const conCupo = medicosPorSede(sede).filter((m) => medicoTieneCupo(m.id));
  return Array.from(new Set(conCupo.map((m) => m.especialidad))).sort();
}

/** Médicos en una sede y especialidad con al menos un cupo disponible. */
export function medicosDisponibles(
  especialidad: string,
  sede: Sede,
): MedicoRegistro[] {
  return medicosPorEspecialidadYSede(especialidad, sede).filter((m) =>
    medicoTieneCupo(m.id),
  );
}
