// ===== SOLID - SRP =====
// Historial de la cita (trazabilidad), notas clínicas y consulta de auditoría.
import { consultar, ejecutar } from "../_lib/db.js";
import { ErrorHttp, sanitizar, type Sesion } from "../_lib/seguridad.js";

export async function historialDeCita(sesion: Sesion, idCita: string) {
  const [cita] = await consultar<{ id_paciente: number; id_medico: number }>(
    "SELECT id_paciente, id_medico FROM cita WHERE id_cita = ?",
    [Number(idCita)],
  );
  if (!cita) throw new ErrorHttp(404, "Cita no encontrada");
  const propia =
    (sesion.rol === "Paciente" && cita.id_paciente === sesion.idPaciente) ||
    (sesion.rol === "Medico" && cita.id_medico === sesion.idMedico) ||
    sesion.rol === "Admin";
  if (!propia) throw new ErrorHttp(403, "Acceso denegado");

  const eventos = await consultar(
    `SELECT estado_anterior, estado_nuevo, fecha_anterior, hora_anterior,
            fecha_nueva, hora_nueva, detalle, marca_tiempo
       FROM cita_historial WHERE id_cita = ? ORDER BY marca_tiempo`,
    [Number(idCita)],
  );
  // Las notas clínicas sólo las ve el médico tratante.
  const notas =
    sesion.rol === "Medico"
      ? await consultar(
          "SELECT contenido, marca_tiempo FROM nota_clinica WHERE id_cita = ? ORDER BY marca_tiempo",
          [Number(idCita)],
        )
      : [];
  return { eventos, notas };
}

export async function agregarNota(sesion: Sesion, idCita: string, datos: Record<string, unknown>) {
  if (sesion.rol !== "Medico" || !sesion.idMedico)
    throw new ErrorHttp(403, "Sólo el médico registra notas clínicas");
  const [cita] = await consultar<{ id_medico: number }>(
    "SELECT id_medico FROM cita WHERE id_cita = ?",
    [Number(idCita)],
  );
  if (!cita) throw new ErrorHttp(404, "Cita no encontrada");
  if (cita.id_medico !== sesion.idMedico) throw new ErrorHttp(403, "La cita no es de su agenda");

  const contenido = sanitizar(datos["contenido"], 2000);
  if (contenido.length < 3) throw new ErrorHttp(400, "Nota vacía");
  await ejecutar("INSERT INTO nota_clinica (id_cita, id_medico, contenido) VALUES (?, ?, ?)", [
    Number(idCita),
    sesion.idMedico,
    contenido,
  ]);
  return { ok: true };
}

export function listarAuditoria(sesion: Sesion) {
  if (sesion.rol !== "Admin") throw new ErrorHttp(403, "Acceso denegado");
  return consultar(
    "SELECT usuario, accion, detalle, marca_tiempo FROM auditoria ORDER BY marca_tiempo DESC LIMIT 300",
  );
}
