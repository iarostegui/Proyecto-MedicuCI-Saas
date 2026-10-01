// ===== SOLID - SRP =====
// Servicio de autenticación y pacientes: registro, login y datos propios.
import { consultar, ejecutar, enTransaccion } from "../_lib/db.js";
import { errorSistema } from "../_lib/catalogo_errores.js";
import {
  ErrorHttp,
  firmarToken,
  hashearContrasena,
  sanitizar,
  verificarContrasena,
  auditar,
  type Sesion,
} from "../_lib/seguridad.js";

const DOMINIO_INSTITUCIONAL = "@medicu.ci.com";

const PREFERENCIAS_ESPECIALIDAD: Record<string, string> = {
  familiar: "Medicina familiar",
  adultos_mayores: "Adultos mayores",
  pediatria: "Pediatría",
  salud_mental: "Salud mental",
  traumatologia: "Traumatología",
  general: "Medicina general",
};

function esDuplicadoMysql(error: unknown): error is {
  code?: string;
  errno?: number;
  message?: string;
  sqlMessage?: string;
} {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; errno?: number };
  return e.code === "ER_DUP_ENTRY" || e.errno === 1062;
}

function mensajeDuplicadoMysql(error: unknown): ErrorHttp {
  const e = error as { message?: string; sqlMessage?: string };
  const detalle = `${e.sqlMessage ?? e.message ?? ""}`.toLowerCase();
  if (detalle.includes("uq_paciente_dni")) return errorSistema("AUTH-0011");
  if (detalle.includes("uq_usuario_correo")) return errorSistema("AUTH-0010");
  return errorSistema("BBDD-0001");
}

interface FilaUsuario {
  id_usuario: number;
  correo: string;
  contrasena: string;
  rol: Sesion["rol"];
  estado: string;
}

export async function sesionCompleta(u: FilaUsuario): Promise<Sesion> {
  const sesion: Sesion = { idUsuario: u.id_usuario, correo: u.correo, rol: u.rol };
  if (u.rol === "Paciente") {
    const [p] = await consultar<{ id_paciente: number }>(
      "SELECT id_paciente FROM paciente WHERE id_usuario = ?",
      [u.id_usuario],
    );
    if (p) sesion.idPaciente = p.id_paciente;
  } else if (u.rol === "Medico") {
    const [m] = await consultar<{ id_medico: number }>(
      "SELECT id_medico FROM medico WHERE id_usuario = ?",
      [u.id_usuario],
    );
    if (m) sesion.idMedico = m.id_medico;
  }
  return sesion;
}

export async function registrarPaciente(datos: Record<string, unknown>) {
  const correo = sanitizar(datos["correo"], 120).toLowerCase();
  const contrasena = String(datos["contrasena"] ?? "");
  const dni = sanitizar(datos["dni"], 8);
  const nombres = sanitizar(datos["nombres"], 80);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) throw errorSistema("AUTH-0001");
  if (correo.endsWith(DOMINIO_INSTITUCIONAL))
    throw errorSistema("AUTH-0002");
  if (!/^\d{8}$/.test(dni)) throw errorSistema("AUTH-0003");
  if (contrasena.length < 8 || !/[a-zA-Z]/.test(contrasena) || !/\d/.test(contrasena))
    throw errorSistema("AUTH-0004");
  if (nombres.length < 3) throw errorSistema("AUTH-0005");
  if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s'-]+$/.test(nombres))
    throw errorSistema("AUTH-0006");

  // La fecha de emisión es obligatoria en el flujo de registro y debe ser coherente.
  const rawFecha = String(datos["fechaEmisionDni"] ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawFecha))
    throw errorSistema("AUTH-0007");
  const fechaEmision = rawFecha;
  const fecha = new Date(`${fechaEmision}T00:00:00`);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (Number.isNaN(fecha.getTime()) || fecha.getTime() > hoy.getTime())
    throw errorSistema("AUTH-0008");
  const minima = new Date(hoy);
  minima.setFullYear(minima.getFullYear() - 60);
  if (fecha.getTime() < minima.getTime())
    throw errorSistema("AUTH-0009");

  let idUsuario: number;
  try {
    idUsuario = await enTransaccion(async (cx) => {
      // Validaciones explícitas para dar mensajes útiles antes del INSERT.
      const [usuariosCorreo] = await cx.execute(
        "SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1",
        [correo],
      );
      if ((usuariosCorreo as unknown[]).length)
        throw errorSistema("AUTH-0010");

      const [pacientesDni] = await cx.execute(
        "SELECT id_paciente FROM paciente WHERE dni = ? LIMIT 1",
        [dni],
      );
      if ((pacientesDni as unknown[]).length)
        throw errorSistema("AUTH-0011");

      const hash = await hashearContrasena(contrasena);

      const [insUsuario] = await cx.execute(
        "INSERT INTO usuario (correo, contrasena, rol) VALUES (?, ?, 'Paciente')",
        [correo, hash],
      );
      const idUsr = (insUsuario as { insertId: number }).insertId;

      const [insPaciente] = await cx.execute(
        `INSERT INTO paciente (id_usuario, nombres, apellidos, dni, fecha_emision_dni, telefono)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          idUsr,
          nombres,
          sanitizar(datos["apellidos"], 80) || null,
          dni,
          fechaEmision,
          sanitizar(datos["telefono"], 15) || null,
        ],
      );

      const idPac = (insPaciente as { insertId: number }).insertId || idUsr;

      // La UI envía IDs estables; la BD conserva nombres normalizados.
      const preferencias = Array.isArray(datos["preferencias"]) ? datos["preferencias"] : [];
      const nombresPreferencia = [...new Set(
        (preferencias as unknown[])
          .map((p) => PREFERENCIAS_ESPECIALIDAD[String(p)] ?? sanitizar(p, 80))
          .filter(Boolean),
      )];

      for (const nombre of nombresPreferencia) {
        await cx.execute(
          `INSERT IGNORE INTO paciente_preferencia (id_paciente, id_especialidad)
           SELECT ?, id_especialidad FROM especialidad WHERE nombre = ? AND estado = 'Activo'`,
          [idPac, nombre],
        );
      }
      return idUsr;
    });
  } catch (error) {
    if (error instanceof ErrorHttp) throw error;
    if (esDuplicadoMysql(error)) throw mensajeDuplicadoMysql(error);
    throw error;
  }

  await auditar(correo, "REGISTRO_USUARIO", "Alta de paciente");
  const [usuario] = await consultar<FilaUsuario>(
    "SELECT id_usuario, correo, contrasena, rol, estado FROM usuario WHERE id_usuario = ?",
    [idUsuario],
  );
  const sesion = await sesionCompleta(usuario);
  return { token: firmarToken(sesion), sesion };
}

export async function iniciarSesion(datos: Record<string, unknown>) {
  const correo = sanitizar(datos["correo"], 120).toLowerCase();
  const contrasena = String(datos["contrasena"] ?? "");
  const [usuario] = await consultar<FilaUsuario>(
    "SELECT id_usuario, correo, contrasena, rol, estado FROM usuario WHERE correo = ?",
    [correo],
  );

  // Await agregado para resolver la verificación asíncrona del hash
  const esValida = usuario ? await verificarContrasena(contrasena, usuario.contrasena) : false;

  if (!usuario || !esValida) {
    await auditar(correo || "anónimo", "ERROR_AUTENTICACION");
    throw errorSistema("AUTH-0012");
  }
  if (usuario.estado !== "Activo") throw errorSistema("AUTH-0013");

  await ejecutar("UPDATE usuario SET ultimo_acceso = NOW() WHERE id_usuario = ?", [
    usuario.id_usuario,
  ]);
  await auditar(correo, "INICIO_SESION");
  const sesion = await sesionCompleta(usuario);
  return { token: firmarToken(sesion), sesion };
}

export async function perfilPropio(sesion: Sesion) {
  if (sesion.rol === "Paciente") {
    const [fila] = await consultar(
      `SELECT p.id_paciente, p.nombres, p.apellidos, p.dni, p.fecha_emision_dni,
              p.telefono, p.direccion, u.correo, u.rol
         FROM paciente p JOIN usuario u ON u.id_usuario = p.id_usuario
        WHERE p.id_usuario = ?`,
      [sesion.idUsuario],
    );
    return fila ?? null;
  }
  const [fila] = await consultar(
    `SELECT m.id_medico, m.codigo_medico, m.nombres, m.apellidos, e.nombre AS especialidad,
            s.nombre AS sede, u.correo, u.rol
       FROM medico m
       JOIN usuario u ON u.id_usuario = m.id_usuario
       JOIN especialidad e ON e.id_especialidad = m.id_especialidad
       JOIN sede s ON s.id_sede = m.id_sede
      WHERE m.id_usuario = ?`,
    [sesion.idUsuario],
  );
  return fila ?? null;
}

/** El paciente sólo actualiza SUS propios datos (A5). */
export async function actualizarPerfil(sesion: Sesion, datos: Record<string, unknown>) {
  if (sesion.rol !== "Paciente" || !sesion.idPaciente)
    throw new ErrorHttp(403, "Sólo pacientes pueden editar este perfil");
  await ejecutar(
    `UPDATE paciente SET nombres = COALESCE(?, nombres), apellidos = COALESCE(?, apellidos),
            telefono = COALESCE(?, telefono), direccion = COALESCE(?, direccion)
      WHERE id_paciente = ?`,
    [
      sanitizar(datos["nombres"], 80) || null,
      sanitizar(datos["apellidos"], 80) || null,
      sanitizar(datos["telefono"], 15) || null,
      sanitizar(datos["direccion"], 180) || null,
      sesion.idPaciente,
    ],
  );
  await auditar(sesion.correo, "ACTUALIZA_PERFIL");
  return { ok: true };
}