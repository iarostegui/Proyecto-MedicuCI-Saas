// ===== INICIO SOLID - ISP =====
// Interface Segregation: en lugar de un único "repositorio gigante", se definen
// interfaces pequeñas y específicas por agregado del dominio. Cada consumidor
// depende solo de los métodos que realmente usa.
// ===== FIN SOLID - ISP =====
//
// ===== INICIO SOLID - LSP =====
// Liskov: cualquier implementación (LocalStorage hoy, MySQL mañana) puede
// sustituir a otra sin que los servicios ni los componentes cambien.
// ===== FIN SOLID - LSP =====
import type {
  Cita,
  Disponibilidad,
  MedicoRegistro,
  Sede,
  UsuarioRegistrado,
} from "@/modelos";

export interface IRepositorioLecturaCitas {
  listar(): Cita[];
  porPaciente(correo: string): Cita[];
  porDoctor(doctorId: string): Cita[];
  buscarPorCodigo(codigo: string): Cita | undefined;
}

export interface IRepositorioEscrituraCitas {
  crear(datos: Omit<Cita, "codigo" | "estado" | "fechaCreacion">): Cita;
  actualizar(codigo: string, cambios: Partial<Cita>): Cita | null;
  cancelar(codigo: string, motivo: string, detalle?: string): Cita | null;
  reprogramar(
    codigo: string,
    fecha: string,
    hora: string,
  ): { ok: true; cita: Cita } | { ok: false; error: string };
}

export interface IRepositorioCitas
  extends IRepositorioLecturaCitas,
    IRepositorioEscrituraCitas {}

export interface IRepositorioUsuarios {
  listar(): UsuarioRegistrado[];
  buscarPorCorreo(correo: string): UsuarioRegistrado | undefined;
  crear(usuario: UsuarioRegistrado): void;
  actualizar(correo: string, cambios: Partial<UsuarioRegistrado>): void;
}

export interface IRepositorioMedicos {
  listar(): MedicoRegistro[];
  buscarPorId(id: string): MedicoRegistro | undefined;
  buscarPorCorreo(correo: string): MedicoRegistro | undefined;
  porSede(sede: Sede): MedicoRegistro[];
}

export interface IRepositorioDisponibilidad {
  obtener(doctorId: string): Disponibilidad;
  guardar(disponibilidad: Disponibilidad): void;
  fechasLibres(doctorId: string, dias?: number): string[];
  horariosLibres(doctorId: string, fecha: string): string[];
}
