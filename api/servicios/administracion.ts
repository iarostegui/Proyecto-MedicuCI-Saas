// ===== SOLID - SRP =====
// Única responsabilidad: operaciones exclusivas del rol Admin
// (gestión de médicos, sedes, especialidades, pacientes) y reportes agregados.
// Todas las consultas son parametrizadas (OWASP A1) y exigen rol Admin (A5).
import { consultar, ejecutar } from "../_lib/db";
import { ErrorHttp, auditar, hashearContrasena, sanitizar, type Sesion } from "../_lib/seguridad";

// ------------------------------------------------------------------ médicos
export function listarMedicosAdmin() {
  return consultar(
    `SELECT m.id_medico, m.codigo_medico, m.nombres, m.apellidos, m.colegiatura, m.estado,
            u.correo, u.id_usuario,
            e.id_especialidad, e.nombre AS especialidad,
            s.id_sede, s.nombre AS sede
       FROM medico m
       JOIN usuario u      ON u.id_usuario = m.id_usuario
       JOIN especialidad e ON e.id_especialidad = m.id_especialidad
       JOIN sede s         ON s.id_sede = m.id_sede
      ORDER BY m.nombres`,
  );
}

interface DatosMedico {
  correo?: unknown;
  contrasena?: unknown;
  nombres?: unknown;
  apellidos?: unknown;
  codigoMedico?: unknown;
  idEspecialidad?: unknown;
  idSede?: unknown;
  colegiatura?: unknown;
}

function exigirTexto(valor: unknown, campo: string, maximo = 120): string {
  const limpio = sanitizar(valor, maximo);
  if (!limpio) throw new ErrorHttp(400, `Campo obligatorio: ${campo}`);
  return limpio;
}

export async function crearMedico(sesion: Sesion, datos: DatosMedico) {
  const correo = exigirTexto(datos.correo, "correo").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new ErrorHttp(400, "Correo inválido");
  const contrasena = String(datos.contrasena ?? "");
  if (contrasena.length < 8) throw new ErrorHttp(400, "La contraseña debe tener al menos 8 caracteres");

  const nombres = exigirTexto(datos.nombres, "nombres", 80);
  const idEspecialidad = Number(datos.idEspecialidad);
  const idSede = Number(datos.idSede);
  if (!idEspecialidad || !idSede) throw new ErrorHttp(400, "Especialidad y sede son obligatorias");

  const existe = await consultar<{ id_usuario: number }>(
    "SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1",
    [correo],
  );
  if (existe.length) throw new ErrorHttp(409, "Ya existe una cuenta con ese correo");

  const usuario = await ejecutar(
    "INSERT INTO usuario (correo, contrasena, rol, estado) VALUES (?, ?, 'Medico', 'Activo')",
    [correo, hashearContrasena(contrasena)],
  );
  const medico = await ejecutar(
    `INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, colegiatura)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      usuario.insertId,
      sanitizar(datos.codigoMedico, 30) || `med_${usuario.insertId}`,
      nombres,
      sanitizar(datos.apellidos, 80) || null,
      idEspecialidad,
      idSede,
      sanitizar(datos.colegiatura, 20) || null,
    ],
  );
  await auditar(sesion.correo, "ALTA_MEDICO", correo);
  return { id_medico: medico.insertId, id_usuario: usuario.insertId };
}

export async function actualizarMedico(sesion: Sesion, id: string, datos: DatosMedico) {
  const idMedico = Number(id);
  const filas = await consultar<{ id_usuario: number }>(
    "SELECT id_usuario FROM medico WHERE id_medico = ? LIMIT 1",
    [idMedico],
  );
  if (!filas.length) throw new ErrorHttp(404, "Médico no encontrado");

  await ejecutar(
    `UPDATE medico
        SET nombres         = COALESCE(?, nombres),
            apellidos       = COALESCE(?, apellidos),
            id_especialidad = COALESCE(?, id_especialidad),
            id_sede         = COALESCE(?, id_sede),
            colegiatura     = COALESCE(?, colegiatura)
      WHERE id_medico = ?`,
    [
      sanitizar(datos.nombres, 80) || null,
      sanitizar(datos.apellidos, 80) || null,
      datos.idEspecialidad ? Number(datos.idEspecialidad) : null,
      datos.idSede ? Number(datos.idSede) : null,
      sanitizar(datos.colegiatura, 20) || null,
      idMedico,
    ],
  );

  const contrasena = String(datos.contrasena ?? "");
  if (contrasena) {
    if (contrasena.length < 8) throw new ErrorHttp(400, "Contraseña demasiado corta");
    await ejecutar("UPDATE usuario SET contrasena = ? WHERE id_usuario = ?", [
      hashearContrasena(contrasena),
      filas[0]!.id_usuario,
    ]);
  }
  await auditar(sesion.correo, "EDITA_MEDICO", `medico ${idMedico}`);
  return { ok: true };
}

/** Baja lógica: nunca se borran médicos con historial clínico (integridad). */
export async function desactivarMedico(sesion: Sesion, id: string) {
  const idMedico = Number(id);
  const resultado = await ejecutar(
    "UPDATE medico m JOIN usuario u ON u.id_usuario = m.id_usuario SET m.estado = 'Inactivo', u.estado = 'Inactivo' WHERE m.id_medico = ?",
    [idMedico],
  );
  if (!resultado.affectedRows) throw new ErrorHttp(404, "Médico no encontrado");
  await auditar(sesion.correo, "BAJA_MEDICO", `medico ${idMedico}`);
  return { ok: true };
}

// --------------------------------------------------------------- pacientes
export function listarPacientes() {
  return consultar(
    `SELECT p.id_paciente, p.nombres, p.apellidos, p.dni, p.telefono, p.estado,
            u.correo, u.fecha_registro
       FROM paciente p JOIN usuario u ON u.id_usuario = p.id_usuario
      ORDER BY u.fecha_registro DESC LIMIT 500`,
  );
}

// ------------------------------------------------------------- catálogos
export async function crearSede(sesion: Sesion, datos: Record<string, unknown>) {
  const nombre = exigirTexto(datos["nombre"], "nombre", 80);
  await ejecutar("INSERT IGNORE INTO sede (nombre, direccion) VALUES (?, ?)", [
    nombre,
    sanitizar(datos["direccion"], 180) || null,
  ]);
  await auditar(sesion.correo, "ALTA_SEDE", nombre);
  return { ok: true };
}

export async function crearEspecialidad(sesion: Sesion, datos: Record<string, unknown>) {
  const nombre = exigirTexto(datos["nombre"], "nombre", 80);
  await ejecutar("INSERT IGNORE INTO especialidad (nombre, descripcion) VALUES (?, ?)", [
    nombre,
    sanitizar(datos["descripcion"], 255) || null,
  ]);
  await auditar(sesion.correo, "ALTA_ESPECIALIDAD", nombre);
  return { ok: true };
}

// ---------------------------------------------------------------- reportes
export interface FiltroReporte {
  desde?: string | undefined;
  hasta?: string | undefined;
  idSede?: string | undefined;
}

function condiciones(filtro: FiltroReporte): { sql: string; params: unknown[] } {
  const partes: string[] = ["1 = 1"];
  const params: unknown[] = [];
  if (filtro.desde) {
    partes.push("c.fecha >= ?");
    params.push(filtro.desde);
  }
  if (filtro.hasta) {
    partes.push("c.fecha <= ?");
    params.push(filtro.hasta);
  }
  if (filtro.idSede) {
    partes.push("c.id_sede = ?");
    params.push(Number(filtro.idSede));
  }
  return { sql: partes.join(" AND "), params };
}

/** KPIs y agregaciones en el motor (GROUP BY) en vez de en el navegador. */
export async function resumenReportes(filtro: FiltroReporte) {
  const { sql, params } = condiciones(filtro);

  const [totales] = await consultar<{ total: number; urgentes: number }>(
    `SELECT COUNT(*) AS total, COALESCE(SUM(c.urgente), 0) AS urgentes
       FROM cita c WHERE ${sql}`,
    params,
  );

  const porEstado = await consultar<{ clave: string; valor: number }>(
    `SELECT e.nombre_estado AS clave, COUNT(c.id_cita) AS valor
       FROM estado_cita e LEFT JOIN cita c ON c.id_estado = e.id_estado AND ${sql}
      GROUP BY e.id_estado, e.nombre_estado ORDER BY valor DESC`,
    params,
  );

  const porSede = await consultar<{ clave: string; valor: number }>(
    `SELECT s.nombre AS clave, COUNT(c.id_cita) AS valor
       FROM sede s LEFT JOIN cita c ON c.id_sede = s.id_sede AND ${sql}
      GROUP BY s.id_sede, s.nombre ORDER BY valor DESC`,
    params,
  );

  const porEspecialidad = await consultar<{ clave: string; valor: number }>(
    `SELECT es.nombre AS clave, COUNT(c.id_cita) AS valor
       FROM especialidad es LEFT JOIN cita c ON c.id_especialidad = es.id_especialidad AND ${sql}
      GROUP BY es.id_especialidad, es.nombre ORDER BY valor DESC`,
    params,
  );

  const porMedico = await consultar<{ clave: string; valor: number }>(
    `SELECT TRIM(CONCAT(m.nombres, ' ', COALESCE(m.apellidos, ''))) AS clave,
            COUNT(c.id_cita) AS valor
       FROM medico m LEFT JOIN cita c ON c.id_medico = m.id_medico AND ${sql}
      GROUP BY m.id_medico ORDER BY valor DESC LIMIT 20`,
    params,
  );

  const ultimosDias = await consultar<{ clave: string; valor: number }>(
    `SELECT DATE_FORMAT(c.fecha, '%Y-%m-%d') AS clave, COUNT(*) AS valor
       FROM cita c
      WHERE ${sql} AND c.fecha >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
      GROUP BY c.fecha ORDER BY c.fecha`,
    params,
  );

  return {
    total: Number(totales?.total ?? 0),
    urgentes: Number(totales?.urgentes ?? 0),
    porEstado,
    porSede,
    porEspecialidad,
    porMedico,
    ultimosDias,
  };
}

// -------------------------------------------------------------- diagnóstico
/** Paso 11 — verificación de conexión real a MySQL (sin exponer credenciales). */
export async function diagnostico() {
  const inicio = Date.now();
  const tablas = await consultar<{ total: number }>(
    "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE()",
  );
  const [version] = await consultar<{ version: string }>("SELECT VERSION() AS version");
  return {
    ok: true,
    baseDatos: "conectada",
    version: version?.version ?? "desconocida",
    tablas: Number(tablas[0]?.total ?? 0),
    latenciaMs: Date.now() - inicio,
  };
}
