// ===== SOLID - SRP / ISP =====
// Catálogos de sólo lectura: sedes, especialidades y médicos.
import { consultar } from "../_lib/db";
import { sanitizar } from "../_lib/seguridad";

export function listarSedes() {
  return consultar("SELECT id_sede, nombre, direccion FROM sede WHERE estado = 'Activo' ORDER BY nombre");
}

/** Especialidades realmente ofertadas en una sede (según médicos activos). */
export function listarEspecialidades(idSede?: string) {
  if (idSede) {
    return consultar(
      `SELECT DISTINCT e.id_especialidad, e.nombre
         FROM especialidad e
         JOIN medico m ON m.id_especialidad = e.id_especialidad
        WHERE m.id_sede = ? AND m.estado = 'Activo' AND e.estado = 'Activo'
        ORDER BY e.nombre`,
      [Number(idSede)],
    );
  }
  return consultar(
    "SELECT id_especialidad, nombre, descripcion FROM especialidad WHERE estado = 'Activo' ORDER BY nombre",
  );
}

export function listarMedicos(filtros: { idSede?: string; idEspecialidad?: string }) {
  const condiciones = ["m.estado = 'Activo'"];
  const parametros: unknown[] = [];
  if (filtros.idSede) {
    condiciones.push("m.id_sede = ?");
    parametros.push(Number(filtros.idSede));
  }
  if (filtros.idEspecialidad) {
    condiciones.push("m.id_especialidad = ?");
    parametros.push(Number(filtros.idEspecialidad));
  }
  return consultar(
    `SELECT m.id_medico, m.codigo_medico, m.nombres, m.apellidos,
            e.id_especialidad, e.nombre AS especialidad,
            s.id_sede, s.nombre AS sede
       FROM medico m
       JOIN especialidad e ON e.id_especialidad = m.id_especialidad
       JOIN sede s ON s.id_sede = m.id_sede
      WHERE ${condiciones.join(" AND ")}
      ORDER BY m.nombres`,
    parametros,
  );
}

export function buscarMedico(id: string) {
  return consultar("SELECT * FROM medico WHERE id_medico = ?", [Number(sanitizar(id, 10))]);
}
