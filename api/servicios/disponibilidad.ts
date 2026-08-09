// ===== SOLID - SRP =====
// Disponibilidad del médico: CRUD y consulta de horarios libres.
// El médico sólo puede tocar SU propia agenda (OWASP A5).
import { consultar, ejecutar } from "../_lib/db";
import { ErrorHttp, auditar, type Sesion } from "../_lib/seguridad";

export function franjasDeMedico(idMedico: string, desde?: string, hasta?: string) {
  return consultar(
    `SELECT id_disponibilidad, id_medico, fecha, hora_inicio, hora_fin, estado
       FROM disponibilidad
      WHERE id_medico = ?
        AND (? IS NULL OR fecha >= ?) AND (? IS NULL OR fecha <= ?)
      ORDER BY fecha, hora_inicio`,
    [Number(idMedico), desde ?? null, desde ?? null, hasta ?? null, hasta ?? null],
  );
}

/** Fechas con al menos un horario libre y no pasado. */
export function fechasLibres(idMedico: string) {
  return consultar(
    `SELECT DISTINCT d.fecha
       FROM disponibilidad d
      WHERE d.id_medico = ? AND d.estado = 'Libre' AND d.fecha >= CURDATE()
        AND NOT EXISTS (
          SELECT 1 FROM cita c
           WHERE c.id_medico = d.id_medico AND c.fecha = d.fecha
             AND c.hora = d.hora_inicio
             AND c.id_estado IN (SELECT id_estado FROM estado_cita
                                  WHERE nombre_estado IN ('Programada','Reprogramada')))
      ORDER BY d.fecha`,
    [Number(idMedico)],
  );
}

/** Horarios libres reales: no ocupados, no bloqueados y no pasados. */
export function horariosLibres(idMedico: string, fecha: string) {
  return consultar(
    `SELECT d.hora_inicio AS hora
       FROM disponibilidad d
      WHERE d.id_medico = ? AND d.fecha = ? AND d.estado = 'Libre'
        AND (d.fecha > CURDATE() OR d.hora_inicio > CURTIME())
        AND NOT EXISTS (
          SELECT 1 FROM cita c
           WHERE c.id_medico = d.id_medico AND c.fecha = d.fecha AND c.hora = d.hora_inicio
             AND c.id_estado IN (SELECT id_estado FROM estado_cita
                                  WHERE nombre_estado IN ('Programada','Reprogramada')))
      ORDER BY d.hora_inicio`,
    [Number(idMedico), fecha],
  );
}

export async function crearFranja(sesion: Sesion, datos: Record<string, unknown>) {
  const idMedico = exigirMedico(sesion);
  const resultado = await ejecutar(
    `INSERT INTO disponibilidad (id_medico, fecha, hora_inicio, hora_fin, estado)
     VALUES (?, ?, ?, ?, 'Libre')
     ON DUPLICATE KEY UPDATE hora_fin = VALUES(hora_fin), estado = 'Libre'`,
    [idMedico, datos["fecha"], datos["horaInicio"], datos["horaFin"]],
  );
  await auditar(sesion.correo, "CAMBIO_DISPONIBILIDAD", `Alta ${String(datos["fecha"])}`);
  return { id: resultado.insertId };
}

export async function actualizarFranja(sesion: Sesion, id: string, datos: Record<string, unknown>) {
  const idMedico = exigirMedico(sesion);
  const resultado = await ejecutar(
    `UPDATE disponibilidad SET estado = COALESCE(?, estado), hora_fin = COALESCE(?, hora_fin)
      WHERE id_disponibilidad = ? AND id_medico = ?`,
    [datos["estado"] ?? null, datos["horaFin"] ?? null, Number(id), idMedico],
  );
  if (!resultado.affectedRows) throw new ErrorHttp(404, "Franja no encontrada en su agenda");
  await auditar(sesion.correo, "CAMBIO_DISPONIBILIDAD", `Edita ${id}`);
  return { ok: true };
}

export async function eliminarFranja(sesion: Sesion, id: string) {
  const idMedico = exigirMedico(sesion);
  const resultado = await ejecutar(
    "DELETE FROM disponibilidad WHERE id_disponibilidad = ? AND id_medico = ? AND estado <> 'Reservado'",
    [Number(id), idMedico],
  );
  if (!resultado.affectedRows) throw new ErrorHttp(404, "Franja no eliminable");
  await auditar(sesion.correo, "CAMBIO_DISPONIBILIDAD", `Baja ${id}`);
  return { ok: true };
}

function exigirMedico(sesion: Sesion): number {
  if (sesion.rol !== "Medico" || !sesion.idMedico)
    throw new ErrorHttp(403, "Sólo un médico gestiona su disponibilidad");
  return sesion.idMedico;
}
