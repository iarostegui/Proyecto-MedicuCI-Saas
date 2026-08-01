// ===== INICIO SOLID - SRP =====
// Implementación LocalStorage de los repositorios. Su única responsabilidad es
// el ACCESO A DATOS; no valida reglas de negocio (eso vive en los servicios).
// ===== FIN SOLID - SRP =====
//
// ===== INICIO SOLID - LSP =====
// Cumple exactamente los contratos de `interfaces.ts`, por lo que puede
// reemplazarse por una implementación MySQL sin tocar servicios ni componentes.
// ===== FIN SOLID - LSP =====
import {
  actualizarCita,
  cancelarCita,
  crearCita,
  citasDeDoctor,
  citasDePaciente,
  obtenerCitas,
  reprogramarCita,
  type Cita,
} from "@/logica/citas";
import {
  buscarMedicoPorCorreo,
  buscarUsuarioPorCorreo,
  guardarUsuario,
  obtenerMedicos,
  obtenerUsuarios,
  type UsuarioRegistrado,
} from "@/logica/autenticacion";
import {
  fechasDisponibles,
  guardarDisponibilidad,
  obtenerDisponibilidad,
  slotsDisponibles,
  type Disponibilidad,
} from "@/logica/disponibilidad";
import type { MedicoRegistro } from "@/datos/medicos_iniciales";
import type { Sede } from "@/datos/sedes";
import type {
  IRepositorioCitas,
  IRepositorioDisponibilidad,
  IRepositorioMedicos,
  IRepositorioUsuarios,
} from "@/repositorios/interfaces";

const CLAVE_USUARIOS = "medicu:usuarios";

export const repositorioCitasLocal: IRepositorioCitas = {
  listar: () => obtenerCitas(),
  porPaciente: (correo) => citasDePaciente(correo),
  porDoctor: (doctorId) => citasDeDoctor(doctorId),
  buscarPorCodigo: (codigo) => obtenerCitas().find((c) => c.codigo === codigo),
  crear: (datos) => crearCita(datos as Parameters<typeof crearCita>[0]),
  actualizar: (codigo, cambios: Partial<Cita>) => actualizarCita(codigo, cambios),
  cancelar: (codigo, motivo, detalle) => cancelarCita(codigo, motivo, detalle),
  reprogramar: (codigo, fecha, hora) => reprogramarCita(codigo, fecha, hora),
};

export const repositorioUsuariosLocal: IRepositorioUsuarios = {
  listar: () => obtenerUsuarios(),
  buscarPorCorreo: (correo) => buscarUsuarioPorCorreo(correo),
  crear: (usuario) => guardarUsuario(usuario),
  actualizar: (correo, cambios) => {
    if (typeof window === "undefined") return;
    const lista: UsuarioRegistrado[] = obtenerUsuarios().map((u) =>
      u.correo.toLowerCase() === correo.toLowerCase() ? { ...u, ...cambios } : u,
    );
    window.localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(lista));
  },
};

export const repositorioMedicosLocal: IRepositorioMedicos = {
  listar: () => obtenerMedicos(),
  buscarPorId: (id) => obtenerMedicos().find((m: MedicoRegistro) => m.id === id),
  buscarPorCorreo: (correo) => buscarMedicoPorCorreo(correo),
  porSede: (sede: Sede) => obtenerMedicos().filter((m) => m.sede === sede),
};

export const repositorioDisponibilidadLocal: IRepositorioDisponibilidad = {
  obtener: (doctorId) => obtenerDisponibilidad(doctorId),
  guardar: (d: Disponibilidad) => guardarDisponibilidad(d),
  fechasLibres: (doctorId, dias) => fechasDisponibles(doctorId, dias),
  horariosLibres: (doctorId, fecha) => slotsDisponibles(doctorId, fecha),
};
