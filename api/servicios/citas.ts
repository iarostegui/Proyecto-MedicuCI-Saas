// ===== SOLID - SRP =====
// Citas: creación con validación de disponibilidad en transacción, consulta
// filtrada por propiedad del recurso, cancelación, reprogramación y estados.
import { consultar, ejecutar, enTransaccion } from "../_lib/db.js";
import { ErrorHttp, auditar, sanitizar, type Sesion } from "../_lib/seguridad.js";
import { crearNotificacion } from "./notificaciones.js";

const SELECT_CITA = `
  SELECT c.id_cita, c.codigo_cita, c.fecha, c.hora, c.motivo, c.observaciones, c.urgente,
         c.fecha_registro, ec.nombre_estado AS estado,
         p.id_paciente, p.nombres AS paciente_nombres, p.apellidos AS paciente_apellidos,
         m.id_medico, m.nombres AS medico_nombres, m.apellidos AS medico_apellidos,
         e.id_especialidad, e.nombre AS especialidad,
         s.id_sede, s.nombre AS sede
    FROM cita c
    JOIN estado_cita ec ON ec.id_estado = c.id_estado
    JOIN paciente p ON p.id_paciente = c.id_paciente
    JOIN medico m ON m.id_medico = c.id_medico
    JOIN especialidad e ON e.id_especialidad = c.id_especialidad
    JOIN sede s ON s.id_sede = c.id_sede`;

async function idEstado(nombre: string): Promise<number> {
  const [fila] = await consultar<{ id_estado: number }>(
    "SELECT id_estado FROM estado_cita WHERE nombre_estado = ?",
    [nombre],
  );
  if (!fila) throw new ErrorHttp(500, "Catálogo de estados incompleto");
  return fila.id_estado;
}

/** Marca como "No asistió" las citas vencidas que siguen programadas. */
export async function conciliarVencidas(): Promise<number> {
  const resultado = await ejecutar(
    `UPDATE cita c
        SET c.id_estado = (SELECT id_estado FROM estado_cita WHERE nombre_estado = 'No asistió')
      WHERE c.id_estado IN (SELECT id_estado FROM estado_cita
                             WHERE nombre_estado IN ('Programada','Reprogramada'))
        AND TIMESTAMP(c.fecha, c.hora) < NOW()`,
  );
  return resultado.affectedRows;
}

/** Cada rol ve únicamente lo suyo (OWASP A5). */
export async function listarCitas(sesion: Sesion, filtros: Record<string, string | undefined>) {
  await conciliarVencidas();
  const condiciones: string[] = [];
  const parametros: unknown[] = [];

  if (sesion.rol === "Paciente") {
    condiciones.push("c.id_paciente = ?");
    parametros.push(sesion.idPaciente);
  } else if (sesion.rol === "Medico") {
    condiciones.push("c.id_medico = ?");
    parametros.push(sesion.idMedico);
  }
  if (filtros["estado"]) {
    condiciones.push("ec.nombre_estado = ?");
    parametros.push(filtros["estado"]);
  }
  if (filtros["fecha"]) {
    condiciones.push("c.fecha = ?");
    parametros.push(filtros["fecha"]);
  }
  const where = condiciones.length ? ` WHERE ${condiciones.join(" AND ")}` : "";
  return consultar(`${SELECT_CITA}${where} ORDER BY c.fecha DESC, c.hora DESC`, parametros);
}

async function citaAutorizada(sesion: Sesion, idCita: number) {
  const [cita] = await consultar<{
    id_cita: number;
    id_paciente: number;
    id_medico: number;
    fecha: string;
    hora: string;
    estado: string;
  }>(
    `SELECT c.id_cita, c.id_paciente, c.id_medico, c.fecha, c.hora, ec.nombre_estado AS estado
       FROM cita c JOIN estado_cita ec ON ec.id_estado = c.id_estado
      WHERE c.id_cita = ?`,
    [idCita],
  );
  if (!cita) throw new ErrorHttp(404, "Cita no encontrada");
  const propia =
    (sesion.rol === "Paciente" && cita.id_paciente === sesion.idPaciente) ||
    (sesion.rol === "Medico" && cita.id_medico === sesion.idMedico) ||
    sesion.rol === "Admin";
  if (!propia) {
    await auditar(sesion.correo, "ACCESO_DENEGADO", `Cita ${idCita}`);
    throw new ErrorHttp(403, "No puede operar sobre esta cita");
  }
  return cita;
}

export async function obtenerCita(sesion: Sesion, id: string) {
  await citaAutorizada(sesion, Number(id));
  const [cita] = await consultar(`${SELECT_CITA} WHERE c.id_cita = ?`, [Number(id)]);
  return cita;
}

export async function crearCita(sesion: Sesion, datos: Record<string, unknown>) {
  if (sesion.rol !== "Paciente" || !sesion.idPaciente)
    throw new ErrorHttp(403, "Sólo un paciente puede agendar su cita");

  const idMedico = Number(datos["idMedico"]);
  const idSede = Number(datos["idSede"]);
  const idEspecialidad = Number(datos["idEspecialidad"]);
  const fecha = String(datos["fecha"] ?? "");
  const hora = String(datos["hora"] ?? "");
  if (!idMedico || !idSede || !idEspecialidad || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !hora)
    throw new ErrorHttp(400, "Datos de la cita incompletos");

  const estadoProgramada = await idEstado("Programada");

  const { idCita, codigo } = await enTransaccion(async (cx) => {
    // El médico debe existir y coincidir con sede y especialidad enviadas.
    const [medicos] = await cx.execute(
      "SELECT id_medico FROM medico WHERE id_medico = ? AND id_sede = ? AND id_especialidad = ? AND estado = 'Activo'",
      [idMedico, idSede, idEspecialidad],
    );
    if (!(medicos as unknown[]).length)
      throw new ErrorHttp(400, "El médico no corresponde a la sede/especialidad indicada");

    // Bloqueo del slot: debe existir, estar libre y no ser pasado.
    const [franjas] = await cx.execute(
      `SELECT id_disponibilidad FROM disponibilidad
        WHERE id_medico = ? AND fecha = ? AND hora_inicio = ? AND estado = 'Libre'
          AND TIMESTAMP(fecha, hora_inicio) > NOW()
        FOR UPDATE`,
      [idMedico, fecha, hora],
    );
    if (!(franjas as unknown[]).length)
      throw new ErrorHttp(409, "El horario ya no está disponible");

    const [anio] = await cx.execute("SELECT YEAR(CURDATE()) AS anio");
    const anioActual = (anio as { anio: number }[])[0].anio;
    const [seq] = await cx.execute(
      "SELECT COUNT(*) + 1 AS n FROM cita WHERE YEAR(fecha_registro) = ?",
      [anioActual],
    );
    const correlativo = String((seq as { n: number }[])[0].n).padStart(5, "0");
    const codCita = `CI-${anioActual}-${correlativo}`;

    const [ins] = await cx.execute(
      `INSERT INTO cita (codigo_cita, id_paciente, id_medico, id_especialidad, id_sede,
                        id_estado, fecha, hora, motivo, urgente)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codCita,
        sesion.idPaciente!,
        idMedico,
        idEspecialidad,
        idSede,
        estadoProgramada,
        fecha,
        hora,
        sanitizar(datos["motivo"], 255) || null,
        datos["urgente"] ? 1 : 0,
      ],
    );
    const idGenerado = (ins as { insertId: number }).insertId;
    await cx.execute(
      "UPDATE disponibilidad SET estado = 'Reservado' WHERE id_medico = ? AND fecha = ? AND hora_inicio = ?",
      [idMedico, fecha, hora],
    );
    await cx.execute(
      "INSERT INTO cita_historial (id_cita, estado_nuevo, fecha_nueva, hora_nueva, id_usuario, detalle) VALUES (?, 'Programada', ?, ?, ?, 'Creación de cita')",
      [idGenerado, fecha, hora, sesion.idUsuario],
    );
    return { idCita: idGenerado, codigo: codCita };
  });

  await auditar(sesion.correo, "CREACION_CITA", codigo);

  // 💡 DEVOLVER EL REGISTRO COMPLETO CON JOINs PARA EL FRONTEND
  const [citaCreada] = await consultar(`${SELECT_CITA} WHERE c.id_cita = ?`, [idCita]);
  return citaCreada;
}

export async function cancelarCita(sesion: Sesion, id: string, datos: Record<string, unknown>) {
  const idCita = Number(id);
  const cita = await citaAutorizada(sesion, idCita);
  if (cita.estado === "Cancelada") throw new ErrorHttp(409, "La cita ya está cancelada");

  const motivo = sanitizar(datos["motivo"], 255);
  // El médico DEBE justificar la cancelación; para el paciente es opcional.
  if (sesion.rol === "Medico" && motivo.length < 5)
    throw new ErrorHttp(400, "El motivo de cancelación es obligatorio para el médico");

  const estadoCancelada = await idEstado("Cancelada");
  await enTransaccion(async (cx) => {
    await cx.execute("UPDATE cita SET id_estado = ?, observaciones = ? WHERE id_cita = ?", [
      estadoCancelada,
      motivo || null,
      idCita,
    ]);
    await cx.execute(
      "INSERT INTO cancelacion (id_cita, motivo, cancelado_por, id_usuario) VALUES (?, ?, ?, ?)",
      [idCita, motivo || null, sesion.rol === "Medico" ? "Medico" : "Paciente", sesion.idUsuario],
    );
    await cx.execute(
      "INSERT INTO cita_historial (id_cita, estado_anterior, estado_nuevo, id_usuario, detalle) VALUES (?, ?, 'Cancelada', ?, ?)",
      [idCita, cita.estado, sesion.idUsuario, motivo || null],
    );
    // Se libera el horario para otros pacientes.
    await cx.execute(
      "UPDATE disponibilidad SET estado = 'Libre' WHERE id_medico = ? AND fecha = ? AND hora_inicio = ?",
      [cita.id_medico, cita.fecha, cita.hora],
    );
  });

  await notificarContraparte(sesion, cita, "Cancelacion", "Cita cancelada", motivo);
  await auditar(sesion.correo, "CANCELACION_CITA", `Cita ${idCita}`);
  return { ok: true };
}

export async function reprogramarCita(sesion: Sesion, id: string, datos: Record<string, unknown>) {
  const idCita = Number(id);
  const cita = await citaAutorizada(sesion, idCita);
  if (cita.estado === "Cancelada" || cita.estado === "Atendida")
    throw new ErrorHttp(409, "La cita no puede reprogramarse en su estado actual");

  const fecha = String(datos["fecha"] ?? "");
  const hora = String(datos["hora"] ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !hora)
    throw new ErrorHttp(400, "Nueva fecha u hora inválida");

  const estadoReprogramada = await idEstado("Reprogramada");
  await enTransaccion(async (cx) => {
    const [franjas] = await cx.execute(
      `SELECT id_disponibilidad FROM disponibilidad
        WHERE id_medico = ? AND fecha = ? AND hora_inicio = ? AND estado = 'Libre'
          AND TIMESTAMP(fecha, hora_inicio) > NOW() FOR UPDATE`,
      [cita.id_medico, fecha, hora],
    );
    if (!(franjas as unknown[]).length) throw new ErrorHttp(409, "El nuevo horario no está disponible");

    await cx.execute("UPDATE cita SET fecha = ?, hora = ?, id_estado = ? WHERE id_cita = ?", [
      fecha,
      hora,
      estadoReprogramada,
      idCita,
    ]);
    await cx.execute(
      "UPDATE disponibilidad SET estado = 'Libre' WHERE id_medico = ? AND fecha = ? AND hora_inicio = ?",
      [cita.id_medico, cita.fecha, cita.hora],
    );
    await cx.execute(
      "UPDATE disponibilidad SET estado = 'Reservado' WHERE id_medico = ? AND fecha = ? AND hora_inicio = ?",
      [cita.id_medico, fecha, hora],
    );
    await cx.execute(
      `INSERT INTO cita_historial (id_cita, estado_anterior, estado_nuevo, fecha_anterior,
              hora_anterior, fecha_nueva, hora_nueva, id_usuario, detalle)
       VALUES (?, ?, 'Reprogramada', ?, ?, ?, ?, ?, 'Reprogramación')`,
      [idCita, cita.estado, cita.fecha, cita.hora, fecha, hora, sesion.idUsuario],
    );
  });

  await notificarContraparte(sesion, cita, "Reprogramacion", "Cita reprogramada", `${fecha} ${hora}`);
  await auditar(sesion.correo, "REPROGRAMACION_CITA", `Cita ${idCita}`);
  return { ok: true };
}

/** Cambio de estado manual (Atendida / No asistió) — sólo el médico de la cita. */
export async function cambiarEstado(sesion: Sesion, id: string, datos: Record<string, unknown>) {
  const cita = await citaAutorizada(sesion, Number(id));
  if (sesion.rol !== "Medico") throw new ErrorHttp(403, "Sólo el médico cambia el estado clínico");
  const nombre = String(datos["estado"] ?? "");
  if (!["Atendida", "No asistió", "Programada"].includes(nombre))
    throw new ErrorHttp(400, "Estado no permitido");
  const estado = await idEstado(nombre);
  await ejecutar("UPDATE cita SET id_estado = ? WHERE id_cita = ?", [estado, Number(id)]);
  await ejecutar(
    "INSERT INTO cita_historial (id_cita, estado_anterior, estado_nuevo, id_usuario) VALUES (?, ?, ?, ?)",
    [Number(id), cita.estado, nombre, sesion.idUsuario],
  );
  await auditar(sesion.correo, "CAMBIO_ESTADO_CITA", `${id} -> ${nombre}`);
  return { ok: true };
}

export async function eliminarCita(sesion: Sesion, id: string) {
  if (sesion.rol !== "Admin") throw new ErrorHttp(403, "Sólo administración puede eliminar citas");
  await ejecutar("DELETE FROM cita WHERE id_cita = ?", [Number(id)]);
  await auditar(sesion.correo, "ELIMINACION_CITA", id);
  return { ok: true };
}

async function notificarContraparte(
  sesion: Sesion,
  cita: { id_cita: number; id_paciente: number; id_medico: number },
  tipo: "Cancelacion" | "Reprogramacion",
  titulo: string,
  detalle?: string,
) {
  // Si actúa el médico se avisa al paciente y viceversa.
  const columna = sesion.rol === "Medico" ? "paciente" : "medico";
  const [fila] = await consultar<{ id_usuario: number }>(
    columna === "paciente"
      ? "SELECT id_usuario FROM paciente WHERE id_paciente = ?"
      : "SELECT id_usuario FROM medico WHERE id_medico = ?",
    [columna === "paciente" ? cita.id_paciente : cita.id_medico],
  );
  if (fila) {
    await crearNotificacion(fila.id_usuario, cita.id_cita, tipo, titulo, detalle ?? titulo);
  }
}
