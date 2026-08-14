// ===== SOLID - SRP =====
// Servicio de autenticación y pacientes: registro, login y datos propios.
import { consultar, ejecutar, enTransaccion } from "../_lib/db.js";
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

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) throw new ErrorHttp(400, "Correo inválido");
  if (correo.endsWith(DOMINIO_INSTITUCIONAL))
    throw new ErrorHttp(403, "Los correos institucionales no pueden registrarse");
  if (!/^\d{8}$/.test(dni)) throw new ErrorHttp(400, "El DNI debe tener 8 dígitos");
  if (contrasena.length < 8 || !/[a-zA-Z]/.test(contrasena) || !/\d/.test(contrasena))
    throw new ErrorHttp(400, "La contraseña debe tener mínimo 8 caracteres con letras y números");
  if (nombres.length < 3) throw new ErrorHttp(400, "Nombre inválido");

  // Validación y formateo limpio de fecha YYYY-MM-DD
  const rawFecha = String(datos["fechaEmisionDni"] ?? "");
  const fechaEmision = /^\d{4}-\d{2}-\d{2}/.test(rawFecha) ? rawFecha.slice(0, 10) : null;

  const idUsuario = await enTransaccion(async (cx) => {
    const [existentes] = await cx.execute(
      "SELECT id_usuario FROM usuario WHERE correo = ?",
      [correo],
    );
    if ((existentes as unknown[]).length) throw new ErrorHttp(409, "El correo ya está registrado");

    // Hasheo asíncrono resuelto antes del INSERT
    const hash = await hashearContrasena(contrasena);

    const [insUsuario] = await cx.execute(
      "INSERT INTO usuario (correo, contrasena, rol) VALUES (?, ?, 'Paciente')",
      [correo, hash]
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

    // Captura segura del ID del paciente recién creado
    const idPac = (insPaciente as { insertId: number }).insertId || idUsr;

    const preferencias = Array.isArray(datos["preferencias"]) ? datos["preferencias"] : [];
    for (const nombre of preferencias as string[]) {
      await cx.execute(
        `INSERT IGNORE INTO paciente_preferencia (id_paciente, id_especialidad)
         SELECT ?, id_especialidad FROM especialidad WHERE nombre = ?`,
        [idPac, sanitizar(nombre, 80)],
      );
    }
    return idUsr;
  });

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
    throw new ErrorHttp(401, "Correo o contraseña incorrectos");
  }
  if (usuario.estado !== "Activo") throw new ErrorHttp(403, "Usuario inactivo o bloqueado");

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