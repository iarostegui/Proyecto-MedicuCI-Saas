// Catálogo central de errores MEDICU CI.
// Formato obligatorio: XXXX-YYYY
// XXXX = dominio/módulo funcional de 4 caracteres.
// YYYY = secuencia numérica única dentro de ese dominio.
//
// Convención inicial:
// AUTH = Autenticación y acceso
// PACI = Pacientes
// CITA = Citas
// TRAT = Tratamientos
// AGEN = Agenda y disponibilidad
// CONF = Configuración
// ADMI = Administración
// BBDD = Base de datos
// SEGU = Seguridad
// SIST = Sistema / infraestructura

export interface DefinicionErrorSistema {
  codigo: string;
  http: number;
  mensaje: string;
}

export const ERRORES_SISTEMA = {
  // AUTH — Autenticación y acceso
  "AUTH-0001": { codigo: "AUTH-0001", http: 400, mensaje: "Correo inválido" },
  "AUTH-0002": {
    codigo: "AUTH-0002",
    http: 403,
    mensaje: "Los correos institucionales no pueden registrarse",
  },
  "AUTH-0003": { codigo: "AUTH-0003", http: 400, mensaje: "El DNI debe tener 8 dígitos" },
  "AUTH-0004": {
    codigo: "AUTH-0004",
    http: 400,
    mensaje: "La contraseña debe tener mínimo 8 caracteres con letras y números",
  },
  "AUTH-0005": { codigo: "AUTH-0005", http: 400, mensaje: "Nombre inválido" },
  "AUTH-0006": {
    codigo: "AUTH-0006",
    http: 400,
    mensaje: "El nombre solo puede contener letras",
  },
  "AUTH-0007": { codigo: "AUTH-0007", http: 400, mensaje: "Fecha de emisión inválida" },
  "AUTH-0008": {
    codigo: "AUTH-0008",
    http: 400,
    mensaje: "La fecha de emisión no puede ser futura",
  },
  "AUTH-0009": {
    codigo: "AUTH-0009",
    http: 400,
    mensaje: "La fecha de emisión es demasiado antigua",
  },
  "AUTH-0010": { codigo: "AUTH-0010", http: 409, mensaje: "El correo ya está registrado" },
  "AUTH-0011": { codigo: "AUTH-0011", http: 409, mensaje: "El DNI ya está registrado" },
  "AUTH-0012": {
    codigo: "AUTH-0012",
    http: 401,
    mensaje: "Correo o contraseña incorrectos",
  },
  "AUTH-0013": {
    codigo: "AUTH-0013",
    http: 403,
    mensaje: "Usuario inactivo o bloqueado",
  },

  // BBDD — Base de datos
  "BBDD-0001": {
    codigo: "BBDD-0001",
    http: 409,
    mensaje: "El registro ya existe o entra en conflicto con uno existente",
  },
  "BBDD-0002": {
    codigo: "BBDD-0002",
    http: 409,
    mensaje: "La operación entra en conflicto con datos relacionados",
  },
  "BBDD-0003": {
    codigo: "BBDD-0003",
    http: 400,
    mensaje: "Uno o más datos enviados no son válidos",
  },
  "BBDD-0004": {
    codigo: "BBDD-0004",
    http: 503,
    mensaje: "El servicio de datos no está disponible temporalmente",
  },

  // SIST — Sistema / infraestructura
  "SIST-0001": {
    codigo: "SIST-0001",
    http: 500,
    mensaje: "Error interno del servidor",
  },
} as const satisfies Record<string, DefinicionErrorSistema>;

export type CodigoErrorSistema = keyof typeof ERRORES_SISTEMA;

export function obtenerErrorSistema(codigo: CodigoErrorSistema): DefinicionErrorSistema {
  return ERRORES_SISTEMA[codigo];
}
