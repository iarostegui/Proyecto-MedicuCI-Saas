// ===== SOLID - SRP =====
// FACHADA DE DATOS: única puerta que usan las pantallas para leer/escribir.
// Decide en tiempo de ejecución si habla con la API (MySQL en Vercel) o con el
// almacenamiento local (vista previa). La interfaz siempre es asíncrona, por lo
// que migrar una pantalla no vuelve a cambiar cuando la API queda disponible.
//
// ===== SOLID - DIP / OCP =====
// Las vistas dependen de esta abstracción; añadir un origen nuevo no obliga a
// modificar componentes ni servicios de dominio.
import { usandoApi } from "@/servicios/origen_datos";
import { api, guardarToken, borrarToken, ErrorApi } from "@/servicios/cliente_api";
import {
  iniciarSesionSegura,
  registrarPacienteSeguro,
  cerrarSesionSegura,
  type ResultadoAcceso,
} from "@/servicios/servicio_autenticacion";
import {
  agendarCita,
  cancelarCitaSegura,
  listarCitasDelMedico,
  listarCitasDelPaciente,
  reprogramarCitaSegura,
  type DatosNuevaCita,
  type ResultadoOperacion,
} from "@/servicios/servicio_citas";
import {
  fechasDeMedico,
  horariosDeMedico,
  especialidadesDeSede,
  medicosDeEspecialidad,
} from "@/servicios/servicio_agenda";
import { SEDES, type Sede } from "@/datos/sedes";
import type { Cita, EstadoCita } from "@/modelos";
import type { ActorAutenticado } from "@/seguridad/autorizacion";
import { establecerSesion, obtenerSesion, type SesionActiva } from "@/servicios/servicio_sesion";

// ---------------------------------------------------------------- mapeos API
interface FilaCitaApi {
  id_cita: number;
  codigo_cita: string;
  fecha: string;
  hora: string;
  observaciones?: string | null;
  urgente?: number | boolean;
  fecha_registro?: string;
  estado: string;
  paciente_nombres?: string;
  paciente_apellidos?: string | null;
  id_medico: number;
  medico_nombres?: string;
  medico_apellidos?: string | null;
  especialidad: string;
  sede: string;
}

function aCita(fila: FilaCitaApi, correoPaciente: string): Cita {
  return {
    codigo: fila.codigo_cita,
    pacienteCorreo: correoPaciente,
    pacienteNombre: `${fila.paciente_nombres ?? ""} ${fila.paciente_apellidos ?? ""}`.trim(),
    doctorId: String(fila.id_medico),
    doctorNombre: `${fila.medico_nombres ?? ""} ${fila.medico_apellidos ?? ""}`.trim(),
    especialidad: fila.especialidad,
    sede: fila.sede,
    fecha: String(fila.fecha).slice(0, 10),
    hora: String(fila.hora).slice(0, 5),
    estado: fila.estado as EstadoCita,
    esUrgente: Boolean(fila.urgente),
    observaciones: fila.observaciones ?? undefined,
    fechaCreacion: fila.fecha_registro ?? new Date().toISOString(),
  };
}

function mensaje(error: unknown, respaldo: string): string {
  return error instanceof ErrorApi ? error.message : respaldo;
}

// ------------------------------------------------------------ autenticación
export async function iniciarSesion(
  correo: string,
  contrasena: string,
): Promise<ResultadoAcceso> {
  if (await usandoApi()) {
    try {
      const r = await api.post<{ token: string; sesion: { correo: string; rol: SesionActiva["rol"]; idMedico?: number } }>(
        "auth/login",
        { correo, contrasena },
      );
      guardarToken(r.token);
      const perfil = (await api.get<Record<string, unknown>>("auth/perfil")) ?? {};
      const nombre = `${String(perfil["nombres"] ?? "")} ${String(perfil["apellidos"] ?? "")}`.trim();
      const sesion: SesionActiva = {
        correo: r.sesion.correo,
        nombre: nombre || r.sesion.correo,
        rol: r.sesion.rol,
        ...(r.sesion.idMedico ? { medicoId: String(r.sesion.idMedico) } : {}),
      };
      establecerSesion(sesion);
      const destino =
        sesion.rol === "Medico" ? "/panel_medico" : sesion.rol === "Admin" ? "/panel_admin" : "/panel_principal";
      return { ok: true, sesion, destino };
    } catch (error) {
      return { ok: false, error: mensaje(error, "Correo o contraseña incorrectos.") };
    }
  }
  return iniciarSesionSegura(correo, contrasena);
}

export interface DatosRegistro {
  dni: string;
  fechaEmision: string;
  nombre: string;
  correo: string;
  contrasena: string;
  especialidades: string[];
}

export async function registrarPaciente(datos: DatosRegistro): Promise<ResultadoAcceso> {
  if (await usandoApi()) {
    try {
      const r = await api.post<{ token: string; sesion: { correo: string; rol: SesionActiva["rol"] } }>(
        "auth/registro",
        {
          correo: datos.correo,
          contrasena: datos.contrasena,
          dni: datos.dni,
          fechaEmisionDni: datos.fechaEmision,
          nombres: datos.nombre,
          preferencias: datos.especialidades,
        },
      );
      guardarToken(r.token);
      const sesion: SesionActiva = { correo: r.sesion.correo, nombre: datos.nombre, rol: "Paciente" };
      establecerSesion(sesion);
      return { ok: true, sesion, destino: "/panel_principal" };
    } catch (error) {
      return { ok: false, error: mensaje(error, "No se pudo completar el registro.") };
    }
  }
  return registrarPacienteSeguro(datos);
}

export async function cerrarSesion(): Promise<void> {
  borrarToken();
  cerrarSesionSegura();
}

// -------------------------------------------------------------------- citas
export async function citasDelPaciente(actor: ActorAutenticado): Promise<Cita[]> {
  if (await usandoApi()) {
    try {
      const filas = await api.get<FilaCitaApi[]>("citas");
      return filas.map((f) => aCita(f, actor.correo));
    } catch {
      return [];
    }
  }
  return listarCitasDelPaciente(actor);
}

export async function citasDelMedico(actor: ActorAutenticado): Promise<Cita[]> {
  if (await usandoApi()) {
    try {
      const filas = await api.get<FilaCitaApi[]>("citas");
      return filas.map((f) => aCita(f, ""));
    } catch {
      return [];
    }
  }
  return listarCitasDelMedico(actor);
}

export async function crearCitaDatos(
  actor: ActorAutenticado,
  nombrePaciente: string,
  datos: DatosNuevaCita & { idMedico?: number; idSede?: number; idEspecialidad?: number },
): Promise<ResultadoOperacion<Cita>> {
  if (await usandoApi()) {
    try {
      const fila = await api.post<FilaCitaApi>("citas", {
        idMedico: datos.idMedico ?? Number(datos.doctorId),
        idSede: datos.idSede,
        idEspecialidad: datos.idEspecialidad,
        fecha: datos.fecha,
        hora: datos.hora,
        urgente: datos.esUrgente ?? false,
        observaciones: datos.observaciones,
      });
      return { ok: true, datos: aCita(fila, actor.correo) };
    } catch (error) {
      return { ok: false, error: mensaje(error, "No se pudo agendar la cita.") };
    }
  }
  return agendarCita(actor, nombrePaciente, datos);
}

export async function cancelar(
  actor: ActorAutenticado,
  codigo: string,
  motivo: string,
  idCita?: number,
): Promise<ResultadoOperacion<Cita>> {
  if (await usandoApi()) {
    try {
      await api.patch(`/citas/${idCita ?? codigo}/cancelar`, { motivo });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mensaje(error, "No se pudo cancelar la cita.") };
    }
  }
  return cancelarCitaSegura(actor, codigo, motivo);
}

export async function reprogramar(
  actor: ActorAutenticado,
  codigo: string,
  fecha: string,
  hora: string,
  idCita?: number,
): Promise<ResultadoOperacion<Cita>> {
  if (await usandoApi()) {
    try {
      await api.patch(`/citas/${idCita ?? codigo}/reprogramar`, { fecha, hora });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mensaje(error, "No se pudo reprogramar la cita.") };
    }
  }
  return reprogramarCitaSegura(actor, codigo, fecha, hora);
}

// -------------------------------------------------------------- agenda
export async function fechasLibres(doctorId: string | number): Promise<string[]> {
  if (await usandoApi()) {
    try {
      const filas = await api.get<{ fecha: string }[]>(`/disponibilidad?idMedico=${doctorId}&soloFechas=1`);
      return filas.map((f) => String(f.fecha).slice(0, 10));
    } catch {
      return [];
    }
  }
  return fechasDeMedico(String(doctorId));
}

export async function horasLibres(doctorId: string | number, fecha: string): Promise<string[]> {
  if (await usandoApi()) {
    try {
      const filas = await api.get<{ hora: string }[]>(
        `/disponibilidad?idMedico=${doctorId}&fecha=${fecha}`,
      );
      return filas.map((f) => String(f.hora).slice(0, 5));
    } catch {
      return [];
    }
  }
  return horariosDeMedico(String(doctorId), fecha);
}

// 💡 ALIAS para mantener compatibilidad con Boton_Urgente:
export const fechasDisponiblesDatos = fechasLibres;
export const horariosLibresDatos = horasLibres;

// -------------------------------------------------------- sesión / actor
// ===== SOLID - SRP =====
// Traduce la sesión activa al actor que exigen los servicios de dominio.
export function actorActual(): ActorAutenticado | null {
  const s = obtenerSesion();
  if (!s) return null;
  return { correo: s.correo, rol: s.rol, ...(s.medicoId ? { medicoId: s.medicoId } : {}) };
}

// ------------------------------------------------------------- catálogos
interface FilaSedeApi { id_sede: number; nombre: string }
interface FilaEspecialidadApi { id_especialidad: number; nombre: string }
interface FilaMedicoApi {
  id_medico: number;
  nombres: string;
  apellidos?: string | null;
  id_especialidad: number;
  especialidad: string;
  id_sede: number;
  sede: string;
}

export interface OpcionSede { id?: number; nombre: string }
export interface OpcionEspecialidad { id?: number; nombre: string }
export interface OpcionMedico {
  id: string;
  idNumerico?: number;
  nombre: string;
  especialidad: string;
  idEspecialidad?: number;
  sede: string;
  idSede?: number;
}

export async function sedesDatos(): Promise<OpcionSede[]> {
  if (await usandoApi()) {
    try {
      const filas = await api.get<FilaSedeApi[]>("/sedes");
      return filas.map((f) => ({ id: f.id_sede, nombre: f.nombre }));
    } catch {
      /* respaldo local */
    }
  }
  return SEDES.map((s) => ({ nombre: s }));
}

export async function especialidadesDeSedeDatos(
  sede: OpcionSede,
): Promise<OpcionEspecialidad[]> {
  if ((await usandoApi()) && sede.id) {
    try {
      const filas = await api.get<FilaEspecialidadApi[]>(`/especialidades?idSede=${sede.id}`);
      return filas.map((f) => ({ id: f.id_especialidad, nombre: f.nombre }));
    } catch {
      /* respaldo local */
    }
  }
  return especialidadesDeSede(sede.nombre as Sede).map((n) => ({ nombre: n }));
}

export async function medicosDatos(
  sede: OpcionSede,
  especialidad: OpcionEspecialidad,
): Promise<OpcionMedico[]> {
  if ((await usandoApi()) && sede.id && especialidad.id) {
    try {
      const filas = await api.get<FilaMedicoApi[]>(
        `/medicos?idSede=${sede.id}&idEspecialidad=${especialidad.id}`,
      );
      return filas.map((f) => ({
        id: String(f.id_medico),
        idNumerico: f.id_medico,
        nombre: `${f.nombres} ${f.apellidos ?? ""}`.trim(),
        especialidad: f.especialidad,
        idEspecialidad: f.id_especialidad,
        sede: f.sede,
        idSede: f.id_sede,
      }));
    } catch {
      /* respaldo local */
    }
  }
  return medicosDeEspecialidad(especialidad.nombre, sede.nombre as Sede).map((m) => ({
    id: m.id,
    nombre: m.nombre,
    especialidad: m.especialidad,
    sede: m.sede,
  }));
}

// =====================================================================
// PASO 8 — NOTIFICACIONES
// ===== SOLID - SRP / DIP =====
// La campana no sabe si los avisos vienen de MySQL o del almacén local.
// =====================================================================
import {
  contarNoLeidas as contarNoLeidasLocal,
  leidasDe as leidasDeLocal,
  marcarLeidas as marcarLeidasLocal,
  notificacionesDe as notificacionesDeLocal,
  type Notificacion,
  type TipoNotificacion,
} from "@/servicios/servicio_notificaciones";
import {
  generarReporte,
  type ResumenReportes,
} from "@/servicios/servicio_reportes";
import {
  obtenerMedicos,
  upsertMedico,
  eliminarMedico as eliminarMedicoLocal,
  obtenerUsuarios,
} from "@/servicios/servicio_sesion";
import {
  guardarDisponibilidad,
  obtenerDisponibilidad,
  type Disponibilidad,
} from "@/servicios/servicio_agenda";
import type { MedicoRegistro } from "@/datos/medicos_iniciales";
import type { RolUsuario } from "@/logica/autenticacion";

interface FilaNotificacionApi {
  id_notificacion: number;
  id_cita: number | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: number | boolean;
  fecha_creacion: string;
}

const TIPO_API_A_LOCAL: Record<string, TipoNotificacion> = {
  Recordatorio: "recordatorio",
  Cancelacion: "cancelada",
  Reprogramacion: "reprogramada",
  Sistema: "recordatorio",
};

export interface NotificacionVista extends Notificacion {
  leida: boolean;
}

export async function notificacionesDatos(
  correo: string,
  rol: RolUsuario,
): Promise<NotificacionVista[]> {
  if (await usandoApi()) {
    try {
      const filas = await api.get<FilaNotificacionApi[]>("/notificaciones");
      return filas.map((f) => ({
        id: String(f.id_notificacion),
        tipo: TIPO_API_A_LOCAL[f.tipo] ?? "recordatorio",
        titulo: f.titulo,
        detalle: f.mensaje,
        fechaOrden: f.fecha_creacion,
        leida: Boolean(f.leida),
      }));
    } catch {
      return [];
    }
  }
  const leidas = leidasDeLocal(correo);
  return notificacionesDeLocal(correo, rol).map((n) => ({ ...n, leida: leidas.has(n.id) }));
}

export async function noLeidasDatos(correo: string, rol: RolUsuario): Promise<number> {
  if (await usandoApi()) {
    return (await notificacionesDatos(correo, rol)).filter((n) => !n.leida).length;
  }
  return contarNoLeidasLocal(correo, rol);
}

export async function marcarNotificacionesLeidas(correo: string, ids: string[]): Promise<void> {
  if (await usandoApi()) {
    try {
      await api.patch("/notificaciones/todas");
    } catch {
      /* silencioso: la campana no debe romper la navegación */
    }
    return;
  }
  marcarLeidasLocal(correo, ids);
}

// =====================================================================
// PASO 9 — DISPONIBILIDAD DEL MÉDICO
// La plantilla semanal se guarda local y, con API activa, se materializa en
// franjas reales de la tabla `disponibilidad`.
// =====================================================================
export function agendaDelMedico(medicoId: string): Disponibilidad {
  return obtenerDisponibilidad(medicoId);
}

export async function guardarAgendaDatos(
  disponibilidad: Disponibilidad,
  dias = 30,
): Promise<ResultadoOperacion<{ franjas: number }>> {
  guardarDisponibilidad(disponibilidad);
  if (await usandoApi()) {
    try {
      const r = await api.post<{ franjas: number }>("/disponibilidad/generar", {
        diasSemana: disponibilidad.diasSemana,
        horaInicio: disponibilidad.horaInicio,
        horaFin: disponibilidad.horaFin,
        duracionMin: disponibilidad.duracionMin,
        fechasBloqueadas: disponibilidad.fechasBloqueadas,
        dias,
      });
      return { ok: true, datos: r };
    } catch (error) {
      return { ok: false, error: mensaje(error, "No se pudo publicar la agenda.") };
    }
  }
  return { ok: true };
}

// =====================================================================
// PASO 10 — ADMINISTRACIÓN Y REPORTES
// =====================================================================
interface FilaMedicoAdminApi {
  id_medico: number;
  codigo_medico: string;
  nombres: string;
  apellidos?: string | null;
  correo: string;
  id_especialidad: number;
  especialidad: string;
  id_sede: number;
  sede: string;
  estado: string;
}

export interface MedicoAdmin extends MedicoRegistro {
  idNumerico?: number;
  idEspecialidad?: number;
  idSede?: number;
}

export async function medicosAdminDatos(): Promise<MedicoAdmin[]> {
  if (await usandoApi()) {
    try {
      const filas = await api.get<FilaMedicoAdminApi[]>("/admin/medicos");
      return filas.map((f) => ({
        id: f.codigo_medico || String(f.id_medico),
        idNumerico: f.id_medico,
        nombre: `${f.nombres} ${f.apellidos ?? ""}`.trim(),
        correo: f.correo,
        contrasena: "",
        especialidad: f.especialidad,
        idEspecialidad: f.id_especialidad,
        sede: f.sede,
        idSede: f.id_sede,
        rol: "Medico",
      }));
    } catch {
      return [];
    }
  }
  return obtenerMedicos();
}

export async function pacientesRegistrados(): Promise<number> {
  if (await usandoApi()) {
    try {
      const filas = await api.get<unknown[]>("/admin/pacientes");
      return filas.length;
    } catch {
      return 0;
    }
  }
  return obtenerUsuarios().length;
}

/** Resuelve el id de sede/especialidad por nombre (la UI trabaja con nombres). */
async function idsCatalogo(
  sede: string,
  especialidad: string,
): Promise<{ idSede?: number; idEspecialidad?: number }> {
  const sedes = await sedesDatos();
  const s = sedes.find((x) => x.nombre === sede);
  const especialidades = s ? await especialidadesDeSedeDatos(s) : [];
  const e = especialidades.find((x) => x.nombre === especialidad);
  return { ...(s?.id ? { idSede: s.id } : {}), ...(e?.id ? { idEspecialidad: e.id } : {}) };
}

export async function guardarMedicoAdmin(
  medico: MedicoAdmin,
  modo: "nuevo" | "editar",
): Promise<ResultadoOperacion<void>> {
  if (await usandoApi()) {
    try {
      const catalogo = await idsCatalogo(medico.sede, medico.especialidad);
      const idEspecialidad = medico.idEspecialidad ?? catalogo.idEspecialidad;
      const idSede = medico.idSede ?? catalogo.idSede;
      if (!idEspecialidad || !idSede) {
        return { ok: false, error: "La sede o la especialidad no existen en el catálogo." };
      }
      const [nombres, ...resto] = medico.nombre.trim().split(" ");
      const cuerpo = {
        correo: medico.correo,
        contrasena: medico.contrasena,
        nombres,
        apellidos: resto.join(" "),
        codigoMedico: medico.id,
        idEspecialidad,
        idSede,
      };
      if (modo === "nuevo") await api.post("/admin/medicos", cuerpo);
      else await api.patch(`/admin/medicos/${medico.idNumerico ?? medico.id}`, cuerpo);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mensaje(error, "No se pudo guardar el médico.") };
    }
  }
  upsertMedico({ ...medico, rol: "Medico" });
  return { ok: true };
}

export async function eliminarMedicoAdmin(
  medico: MedicoAdmin,
): Promise<ResultadoOperacion<void>> {
  if (await usandoApi()) {
    try {
      await api.delete(`/admin/medicos/${medico.idNumerico ?? medico.id}`);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: mensaje(error, "No se pudo dar de baja al médico.") };
    }
  }
  eliminarMedicoLocal(medico.id);
  return { ok: true };
}

export async function reporteDatos(filtro: {
  desde?: string;
  hasta?: string;
  sede?: string;
}): Promise<ResumenReportes> {
  if (await usandoApi()) {
    try {
      const sedes = await sedesDatos();
      const idSede = filtro.sede ? sedes.find((s) => s.nombre === filtro.sede)?.id : undefined;
      const parametros = new URLSearchParams();
      if (filtro.desde) parametros.set("desde", filtro.desde);
      if (filtro.hasta) parametros.set("hasta", filtro.hasta);
      if (idSede) parametros.set("idSede", String(idSede));
      return await api.get<ResumenReportes>(`/reportes?${parametros.toString()}`);
    } catch {
      /* respaldo local */
    }
  }
  return generarReporte(filtro);
}

// =====================================================================
// PASO 11 — DIAGNÓSTICO DE CONEXIÓN
// =====================================================================
export interface Diagnostico {
  origen: "api" | "local";
  baseDatos?: string;
  version?: string;
  tablas?: number;
  latenciaMs?: number;
  error?: string;
}

export async function diagnosticoConexion(): Promise<Diagnostico> {
  if (!(await usandoApi())) return { origen: "local" };
  try {
    const r = await api.get<Omit<Diagnostico, "origen">>("/salud?db=1");
    return { origen: "api", ...r };
  } catch (error) {
    return { origen: "api", error: mensaje(error, "La API responde pero MySQL no.") };
  }
}