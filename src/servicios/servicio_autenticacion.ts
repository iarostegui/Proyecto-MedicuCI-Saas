// ===== INICIO SOLID - SRP =====
// SERVICIO DE AUTENTICACIÓN: única responsabilidad = registrar usuarios,
// verificar credenciales y administrar la sesión (token JWT).
// Ninguna vista vuelve a comparar contraseñas por su cuenta.
// ===== FIN SOLID - SRP =====
import {
  buscarMedicoPorCorreo,
  buscarUsuarioPorCorreo,
  esCorreoInstitucional,
  establecerSesion,
  guardarUsuario,
  limpiarSesion,
  obtenerSesion,
  upsertMedico,
  validarLoginAdmin,
  type SesionActiva,
  type UsuarioRegistrado,
} from "@/logica/autenticacion";
import { repositorios } from "@/repositorios/contenedor";
import { hashearContrasena, verificarContrasena } from "@/seguridad/hash_contrasena";
import { emitirToken, segundosRestantes, verificarToken } from "@/seguridad/jwt";
import { registrarAuditoria } from "@/seguridad/auditoria";
import { sanitizarTexto } from "@/seguridad/sanitizacion";
import { mensajeErrorSeguro } from "@/seguridad/configuracion";
import type { ActorAutenticado } from "@/seguridad/autorizacion";

const CLAVE_TOKEN = "medicu:token";

// ===== INICIO OWASP A2 =====
// A2 — Fallos criptográficos / de autenticación.
// Las contraseñas se guardan con BCrypt y la sesión se respalda con un JWT
// firmado (HS256) con expiración. El token se valida en cada lectura de sesión.
function guardarToken(sesion: SesionActiva): void {
  if (typeof window === "undefined") return;
  const token = emitirToken({ sub: sesion.correo, rol: sesion.rol, nombre: sesion.nombre });
  window.localStorage.setItem(CLAVE_TOKEN, token);
}

export function obtenerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CLAVE_TOKEN);
}

export function minutosRestantesSesion(): number {
  return Math.ceil(segundosRestantes(obtenerToken()) / 60);
}
// ===== FIN OWASP A2 =====

/** Mensaje único para credenciales inválidas (no revela si el correo existe). */
const CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos.";

export interface ResultadoAcceso {
  ok: boolean;
  error?: string;
  sesion?: SesionActiva;
  destino?: string;
}

/** Inicia sesión verificando el hash BCrypt y emitiendo el token JWT. */
export function iniciarSesionSegura(correoEntrada: string, contrasena: string): ResultadoAcceso {
  const correo = sanitizarTexto(correoEntrada, 120).trim().toLowerCase();

  // Administrador del sistema
  if (validarLoginAdmin(correo, contrasena)) {
    const sesion: SesionActiva = { correo, nombre: "Administrador", rol: "Admin" };
    establecerSesion(sesion);
    guardarToken(sesion);
    registrarAuditoria(correo, "INICIO_SESION", "Acceso de administrador");
    return { ok: true, sesion, destino: "/panel_admin" };
  }

  // Cuentas institucionales → sólo médicos existentes
  if (esCorreoInstitucional(correo)) {
    const medico = buscarMedicoPorCorreo(correo);
    if (!medico) {
      registrarAuditoria(correo, "ERROR_AUTENTICACION", "Cuenta institucional inexistente");
      return { ok: false, error: CREDENCIALES_INVALIDAS };
    }
    const r = verificarContrasena(contrasena, medico.contrasena);
    if (!r.valida) {
      registrarAuditoria(correo, "ERROR_AUTENTICACION", "Contraseña incorrecta (médico)");
      return { ok: false, error: CREDENCIALES_INVALIDAS };
    }
    // Migración transparente de contraseñas legadas en texto plano.
    if (r.requiereMigracion) upsertMedico({ ...medico, contrasena: hashearContrasena(contrasena) });
    const sesion: SesionActiva = {
      correo: medico.correo,
      nombre: medico.nombre,
      rol: "Medico",
      medicoId: medico.id,
    };
    establecerSesion(sesion);
    guardarToken(sesion);
    registrarAuditoria(correo, "INICIO_SESION", "Acceso de médico");
    return { ok: true, sesion, destino: "/panel_medico" };
  }

  // Pacientes
  const usuario = buscarUsuarioPorCorreo(correo);
  if (!usuario) {
    registrarAuditoria(correo, "ERROR_AUTENTICACION", "Paciente inexistente");
    return { ok: false, error: "Correo o contraseña incorrectos. Si no tienes cuenta, regístrate." };
  }
  const r = verificarContrasena(contrasena, usuario.contrasena);
  if (!r.valida) {
    registrarAuditoria(correo, "ERROR_AUTENTICACION", "Contraseña incorrecta (paciente)");
    return { ok: false, error: "Correo o contraseña incorrectos. Si no tienes cuenta, regístrate." };
  }
  if (r.requiereMigracion) {
    repositorios().usuarios.actualizar(usuario.correo, {
      contrasena: hashearContrasena(contrasena),
    });
  }
  const sesion: SesionActiva = { correo: usuario.correo, nombre: usuario.nombre, rol: "Paciente" };
  establecerSesion(sesion);
  guardarToken(sesion);
  registrarAuditoria(correo, "INICIO_SESION", "Acceso de paciente");
  return { ok: true, sesion, destino: "/panel_principal" };
}

/** Registra un paciente nuevo con la contraseña ya hasheada. */
export function registrarPacienteSeguro(
  datos: Omit<UsuarioRegistrado, "rol">,
): ResultadoAcceso {
  try {
    const usuario: UsuarioRegistrado = {
      ...datos,
      nombre: sanitizarTexto(datos.nombre, 80),
      correo: datos.correo.trim().toLowerCase(),
      // ===== INICIO OWASP A2 =====
      contrasena: hashearContrasena(datos.contrasena),
      // ===== FIN OWASP A2 =====
      rol: "Paciente",
    };
    guardarUsuario(usuario);
    const sesion: SesionActiva = {
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: "Paciente",
    };
    establecerSesion(sesion);
    guardarToken(sesion);
    registrarAuditoria(usuario.correo, "REGISTRO_USUARIO", "Alta de paciente");
    return { ok: true, sesion, destino: "/panel_principal" };
  } catch {
    // ===== INICIO OWASP A9 =====
    // Nunca se expone el error interno al usuario final.
    return { ok: false, error: mensajeErrorSeguro("No se pudo completar el registro.") };
    // ===== FIN OWASP A9 =====
  }
}

/** Sesión vigente sólo si además el token JWT sigue siendo válido. */
export function obtenerSesionVigente(): SesionActiva | null {
  const sesion = obtenerSesion();
  if (!sesion) return null;
  const carga = verificarToken(obtenerToken());
  // Sesiones creadas antes del JWT se re-emiten en lugar de expulsar al usuario.
  if (!carga) {
    guardarToken(sesion);
    return sesion;
  }
  if (carga.sub.toLowerCase() !== sesion.correo.toLowerCase()) {
    cerrarSesionSegura();
    return null;
  }
  return sesion;
}

/** Actor para las comprobaciones de autorización. */
export function obtenerActor(): ActorAutenticado | null {
  const sesion = obtenerSesionVigente();
  if (!sesion) return null;
  const medicoId =
    sesion.medicoId ?? (sesion.rol === "Medico" ? buscarMedicoPorCorreo(sesion.correo)?.id : undefined);
  return { correo: sesion.correo, rol: sesion.rol, medicoId };
}

export function cerrarSesionSegura(): void {
  const sesion = obtenerSesion();
  if (sesion) registrarAuditoria(sesion.correo, "CIERRE_SESION");
  limpiarSesion();
  if (typeof window !== "undefined") window.localStorage.removeItem(CLAVE_TOKEN);
}
