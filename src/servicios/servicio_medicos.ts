// ===== INICIO SOLID - SRP =====
// SERVICIO DE MÉDICOS: única responsabilidad = consultar médicos, sedes y
// especialidades (con y sin filtro de cupo disponible).
// ===== FIN SOLID - SRP =====
// FUTURA CONEXIÓN MYSQL: consultas SELECT sobre `medicos`.
export {
  buscarMedicoPorId,
  especialidadesDisponiblesEnSede,
  listarEspecialidades,
  listarMedicos,
  medicosDisponibles,
  medicosPorEspecialidad,
  medicosPorEspecialidadYSede,
  medicosPorSede,
} from "@/logica/medicos";

export type { MedicoRegistro, Sede } from "@/modelos";
