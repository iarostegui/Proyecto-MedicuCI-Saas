import {
  MEDICOS_INICIALES,
  DOMINIO_INSTITUCIONAL,
  type MedicoRegistro,
} from "@/datos/medicos_iniciales";
import { inicializarDisponibilidad } from "@/logica/disponibilidad";


export type RolUsuario = "Paciente" | "Medico" | "Admin";

export const CORREO_ADMIN = "admin@medicu.ci.com";
const CONTRASENA_ADMIN = "Medicu2026";

export interface UsuarioRegistrado {
  dni: string;
  fechaEmision: string;
  nombre: string;
  correo: string;
  contrasena: string;
  especialidades: string[];
  rol: RolUsuario;
}

export interface SesionActiva {
  correo: string;
  nombre: string;
  rol: RolUsuario;
}

const CLAVE_USUARIOS = "medicu:usuarios";
const CLAVE_SESION = "medicu:sesion";
const CLAVE_MEDICOS = "medicu:medicos";
const CLAVE_USUARIOS_LEGACY = "medicu:users";
const CLAVE_SESION_LEGACY = "medicu:session";

function almacenamientoSeguro(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Migra claves antiguas y siembra los médicos institucionales la primera vez. */
export function inicializarAlmacen(): void {
  const s = almacenamientoSeguro();
  if (!s) return;

  // Migración: medicu:users -> medicu:usuarios
  const legacy = s.getItem(CLAVE_USUARIOS_LEGACY);
  if (legacy && !s.getItem(CLAVE_USUARIOS)) {
    try {
      const anteriores = JSON.parse(legacy) as Array<Record<string, unknown>>;
      const migrados: UsuarioRegistrado[] = anteriores.map((u) => ({
        dni: String(u.dni ?? ""),
        fechaEmision: String(u.issueDate ?? ""),
        nombre: String(u.fullName ?? ""),
        correo: String(u.email ?? ""),
        contrasena: String(u.password ?? ""),
        especialidades: Array.isArray(u.specialties) ? (u.specialties as string[]) : [],
        rol: "Paciente",
      }));
      s.setItem(CLAVE_USUARIOS, JSON.stringify(migrados));
      s.removeItem(CLAVE_USUARIOS_LEGACY);
    } catch {
      /* noop */
    }
  }

  const sesionLegacy = s.getItem(CLAVE_SESION_LEGACY);
  if (sesionLegacy && !s.getItem(CLAVE_SESION)) {
    s.removeItem(CLAVE_SESION_LEGACY);
  }

  // Seed / actualiza médicos institucionales.
  let medicos: MedicoRegistro[] = [];
  try {
    medicos = JSON.parse(s.getItem(CLAVE_MEDICOS) || "[]") as MedicoRegistro[];
  } catch {
    medicos = [];
  }
  const idsExistentes = new Set(medicos.map((m) => m.id));
  const faltantes = MEDICOS_INICIALES.filter((m) => !idsExistentes.has(m.id));
  if (medicos.length === 0 || faltantes.length > 0) {
    s.setItem(CLAVE_MEDICOS, JSON.stringify([...medicos, ...faltantes]));
  }

  // Seed disponibilidad por médico
  inicializarDisponibilidad();
}



export function obtenerUsuarios(): UsuarioRegistrado[] {
  const s = almacenamientoSeguro();
  if (!s) return [];
  try {
    return JSON.parse(s.getItem(CLAVE_USUARIOS) || "[]") as UsuarioRegistrado[];
  } catch {
    return [];
  }
}

export function guardarUsuario(usuario: UsuarioRegistrado): void {
  const s = almacenamientoSeguro();
  if (!s) return;
  const lista = obtenerUsuarios();
  lista.push(usuario);
  s.setItem(CLAVE_USUARIOS, JSON.stringify(lista));
}

export function obtenerMedicos(): MedicoRegistro[] {
  const s = almacenamientoSeguro();
  if (!s) return MEDICOS_INICIALES;
  try {
    const raw = s.getItem(CLAVE_MEDICOS);
    if (!raw) return MEDICOS_INICIALES;
    return JSON.parse(raw) as MedicoRegistro[];
  } catch {
    return MEDICOS_INICIALES;
  }
}

function guardarMedicos(lista: MedicoRegistro[]) {
  const s = almacenamientoSeguro();
  if (!s) return;
  s.setItem(CLAVE_MEDICOS, JSON.stringify(lista));
}

/** Alta o edición de un médico. Devuelve el registro final. */
export function upsertMedico(medico: MedicoRegistro): MedicoRegistro {
  const lista = obtenerMedicos();
  const idx = lista.findIndex((m) => m.id === medico.id);
  if (idx >= 0) lista[idx] = medico;
  else lista.push(medico);
  guardarMedicos(lista);
  inicializarDisponibilidad();
  return medico;
}

export function eliminarMedico(id: string): void {
  const lista = obtenerMedicos().filter((m) => m.id !== id);
  guardarMedicos(lista);
}

export function buscarUsuarioPorCorreo(correo: string): UsuarioRegistrado | undefined {
  return obtenerUsuarios().find((u) => u.correo.toLowerCase() === correo.toLowerCase());
}

export function buscarMedicoPorCorreo(correo: string): MedicoRegistro | undefined {
  return obtenerMedicos().find((m) => m.correo.toLowerCase() === correo.toLowerCase());
}

export function esCorreoInstitucional(correo: string): boolean {
  return correo.trim().toLowerCase().endsWith(DOMINIO_INSTITUCIONAL);
}

export function esCorreoAdmin(correo: string): boolean {
  return correo.trim().toLowerCase() === CORREO_ADMIN;
}

export function validarLoginAdmin(correo: string, contrasena: string): boolean {
  return esCorreoAdmin(correo) && contrasena === CONTRASENA_ADMIN;
}

export function establecerSesion(sesion: SesionActiva): void {
  const s = almacenamientoSeguro();
  if (!s) return;
  s.setItem(CLAVE_SESION, JSON.stringify(sesion));
}

export function limpiarSesion(): void {
  const s = almacenamientoSeguro();
  if (!s) return;
  s.removeItem(CLAVE_SESION);
}

export function obtenerSesion(): SesionActiva | null {
  const s = almacenamientoSeguro();
  if (!s) return null;
  const raw = s.getItem(CLAVE_SESION);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SesionActiva;
  } catch {
    return null;
  }
}

// ---------- Validaciones ----------

export function validarDni(dni: string): string | null {
  if (!/^\d{8}$/.test(dni)) return "El DNI debe tener exactamente 8 dígitos.";
  return null;
}

export function validarFechaEmision(fecha: string): string | null {
  if (!fecha) return "Ingresa la fecha de emisión.";
  const d = new Date(fecha);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (isNaN(d.getTime())) return "Fecha inválida.";
  if (d.getTime() > hoy.getTime()) return "La fecha no puede ser futura.";
  const minima = new Date();
  minima.setFullYear(minima.getFullYear() - 60);
  if (d.getTime() < minima.getTime()) return "Fecha demasiado antigua.";
  return null;
}

export function validarNombre(nombre: string): string | null {
  const limpio = nombre.trim();
  if (limpio.length < 3) return "Ingresa tu nombre completo (mínimo 3 caracteres).";
  if (limpio.length > 80) return "El nombre es demasiado largo.";
  if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s'-]+$/.test(limpio))
    return "El nombre solo puede contener letras.";
  return null;
}

export function validarCorreo(correo: string): string | null {
  const limpio = correo.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return "Correo electrónico inválido.";
  if (limpio.length > 120) return "El correo es demasiado largo.";
  return null;
}

export function validarContrasena(contrasena: string): string | null {
  if (contrasena.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena))
    return "La contraseña debe incluir letras y números.";
  return null;
}
