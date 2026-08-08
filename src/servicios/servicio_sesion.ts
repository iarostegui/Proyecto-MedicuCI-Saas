// ===== INICIO SOLID - SRP =====
// SERVICIO DE SESIÓN: única responsabilidad = exponer a la interfaz todo lo
// relativo a sesión, usuarios y médicos. Las vistas NO conocen LocalStorage.
// ===== FIN SOLID - SRP =====
//
// ===== INICIO SOLID - DIP =====
// Las páginas dependen de esta abstracción (servicio), no de `@/logica/*`.
// Al migrar a MySQL sólo cambia la implementación detrás de este archivo.
// ===== FIN SOLID - DIP =====
//
// FUTURA CONEXIÓN MYSQL: reemplazar el cuerpo por llamadas a /api/usuarios.
export {
  CORREO_ADMIN,
  buscarMedicoPorCorreo,
  buscarUsuarioPorCorreo,
  eliminarMedico,
  esCorreoAdmin,
  esCorreoInstitucional,
  establecerSesion,
  guardarUsuario,
  inicializarAlmacen,
  limpiarSesion,
  obtenerMedicos,
  obtenerSesion,
  obtenerUsuarios,
  upsertMedico,
  validarContrasena,
  validarCorreo,
  validarDni,
  validarFechaEmision,
  validarLoginAdmin,
  validarNombre,
} from "@/logica/autenticacion";

export type {
  RolUsuario,
  SesionActiva,
  UsuarioRegistrado,
} from "@/logica/autenticacion";
