// ===== SOLID - SRP =====
// Notificaciones del usuario autenticado (listar, crear, marcar leídas).
import { consultar, ejecutar } from "../_lib/db.js";
import { ErrorHttp, sanitizar, type Sesion } from "../_lib/seguridad.js";

export async function crearNotificacion(
  idUsuario: number,
  idCita: number | null,
  tipo: string,
  titulo: string,
  mensaje: string,
): Promise<void> {
  await ejecutar(
    "INSERT INTO notificacion (id_usuario, id_cita, tipo, titulo, mensaje) VALUES (?, ?, ?, ?, ?)",
    [idUsuario, idCita, tipo, sanitizar(titulo, 120), sanitizar(mensaje, 500)],
  );
}

export function listarNotificaciones(sesion: Sesion) {
  return consultar(
    `SELECT id_notificacion, id_cita, tipo, titulo, mensaje, leida, fecha_creacion
       FROM notificacion WHERE id_usuario = ?
      ORDER BY fecha_creacion DESC LIMIT 100`,
    [sesion.idUsuario],
  );
}

export async function marcarLeida(sesion: Sesion, id: string) {
  const resultado = await ejecutar(
    "UPDATE notificacion SET leida = 1, fecha_lectura = NOW() WHERE id_notificacion = ? AND id_usuario = ?",
    [Number(id), sesion.idUsuario],
  );
  if (!resultado.affectedRows) throw new ErrorHttp(404, "Notificación no encontrada");
  return { ok: true };
}

export async function marcarTodasLeidas(sesion: Sesion) {
  await ejecutar(
    "UPDATE notificacion SET leida = 1, fecha_lectura = NOW() WHERE id_usuario = ? AND leida = 0",
    [sesion.idUsuario],
  );
  return { ok: true };
}
