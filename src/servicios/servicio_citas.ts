// ===== INICIO SOLID - SRP =====
// SERVICIO DE CITAS: única responsabilidad = reglas de negocio de citas.
// La presentación (componentes) NO accede a LocalStorage ni a los repositorios
// directamente: siempre pasa por este servicio.
// ===== FIN SOLID - SRP =====
//
// ===== INICIO SOLID - DIP =====
// Depende de la abstracción `repositorios()`, no de la implementación concreta.
// ===== FIN SOLID - DIP =====
import { repositorios } from "@/repositorios/contenedor";
import { conciliarEstadosVencidos, type Cita } from "@/logica/citas";
import { esFechaPasada, fechaLocalISO } from "@/logica/disponibilidad";
import { registrarAuditoria } from "@/seguridad/auditoria";
import { sanitizarTexto } from "@/seguridad/sanitizacion";
import { validarFechaSeguro, validarMotivoSeguro } from "@/seguridad/validacion";
import {
  autorizar,
  esDuenoDelRecurso,
  esMedicoDeLaCita,
  type ActorAutenticado,
} from "@/seguridad/autorizacion";

export interface ResultadoOperacion<T = void> {
  ok: boolean;
  error?: string;
  datos?: T;
}

/** Ejecuta el proceso automático de estados y devuelve cuántas citas cambiaron. */
export function sincronizarEstados(usuario = "sistema"): number {
  const cambios = conciliarEstadosVencidos();
  if (cambios > 0) {
    registrarAuditoria(usuario, "ESTADO_AUTOMATICO", `${cambios} cita(s) marcadas como "No asistió".`);
  }
  return cambios;
}

// ===== INICIO OWASP A5 =====
/** Citas del paciente autenticado. Nunca devuelve datos de otro paciente. */
export function listarCitasDelPaciente(actor: ActorAutenticado): Cita[] {
  sincronizarEstados(actor.correo);
  return repositorios()
    .citas.porPaciente(actor.correo)
    .filter((c) => esDuenoDelRecurso(actor, c.pacienteCorreo));
}

/** Citas del médico autenticado. Nunca devuelve la agenda de otro médico. */
export function listarCitasDelMedico(actor: ActorAutenticado): Cita[] {
  if (!actor.medicoId) return [];
  sincronizarEstados(actor.correo);
  return repositorios()
    .citas.porDoctor(actor.medicoId)
    .filter((c) => esMedicoDeLaCita(actor, c.doctorId));
}
// ===== FIN OWASP A5 =====

export interface DatosNuevaCita {
  doctorId: string;
  doctorNombre: string;
  especialidad: string;
  sede: string;
  fecha: string;
  hora: string;
  esUrgente?: boolean;
  observaciones?: string;
}

/** Agenda una cita validando fecha, disponibilidad y saneando el texto libre. */
export function agendarCita(
  actor: ActorAutenticado,
  nombrePaciente: string,
  datos: DatosNuevaCita,
): ResultadoOperacion<Cita> {
  // ===== INICIO OWASP A1 =====
  const fechaValida = validarFechaSeguro(datos.fecha);
  if (!fechaValida.ok) return { ok: false, error: fechaValida.error };
  // ===== FIN OWASP A1 =====

  // ===== INICIO MEJORA FUNCIONAL =====
  // Mejora funcional 3 — No se permiten citas en fechas anteriores a hoy.
  if (esFechaPasada(datos.fecha)) {
    return {
      ok: false,
      error: "Esa fecha ya no se encuentra disponible. Elige el día de hoy o una fecha futura.",
    };
  }
  const horariosLibres = repositorios().disponibilidad.horariosLibres(datos.doctorId, datos.fecha);
  if (!horariosLibres.includes(datos.hora)) {
    return {
      ok: false,
      error: "Ese horario ya no se encuentra disponible. Selecciona otro horario.",
    };
  }
  // ===== FIN MEJORA FUNCIONAL =====

  const cita = repositorios().citas.crear({
    pacienteCorreo: actor.correo,
    pacienteNombre: sanitizarTexto(nombrePaciente, 80),
    doctorId: datos.doctorId,
    doctorNombre: datos.doctorNombre,
    especialidad: datos.especialidad,
    sede: datos.sede as Cita["sede"],
    fecha: datos.fecha,
    hora: datos.hora,
    esUrgente: datos.esUrgente,
    // ===== INICIO OWASP A7 =====
    observaciones: datos.observaciones ? sanitizarTexto(datos.observaciones) : undefined,
    // ===== FIN OWASP A7 =====
  });

  registrarAuditoria(actor.correo, "CREACION_CITA", `${cita.codigo} · ${cita.fecha} ${cita.hora}`);
  return { ok: true, datos: cita };
}

/** Cancela una cita. El motivo es obligatorio para el médico y opcional para el paciente. */
export function cancelarCitaSegura(
  actor: ActorAutenticado,
  codigo: string,
  motivoLibre: string,
): ResultadoOperacion<Cita> {
  const cita = repositorios().citas.buscarPorCodigo(codigo);
  if (!cita) return { ok: false, error: "La cita no existe." };

  // ===== INICIO OWASP A5 =====
  const permitido =
    (actor.rol === "Paciente" && esDuenoDelRecurso(actor, cita.pacienteCorreo)) ||
    esMedicoDeLaCita(actor, cita.doctorId);
  if (!autorizar(actor, permitido, `Intento de cancelar la cita ${codigo}`)) {
    return { ok: false, error: "No tienes permiso para cancelar esta cita." };
  }
  // ===== FIN OWASP A5 =====

  const esMedico = actor.rol === "Medico";
  // ===== INICIO OWASP A1 =====
  const motivo = validarMotivoSeguro(motivoLibre, esMedico);
  if (!motivo.ok) return { ok: false, error: motivo.error };
  // ===== FIN OWASP A1 =====

  const base = esMedico ? "Cancelada por el médico" : "Cancelada por el paciente";
  const actualizada = repositorios().citas.cancelar(codigo, base, motivo.valor || undefined);
  registrarAuditoria(actor.correo, "CANCELACION_CITA", `${codigo} · ${base}`);
  return actualizada ? { ok: true, datos: actualizada } : { ok: false, error: "No se pudo cancelar." };
}

/** Reprograma una cita del paciente validando que la nueva fecha no sea pasada. */
export function reprogramarCitaSegura(
  actor: ActorAutenticado,
  codigo: string,
  fecha: string,
  hora: string,
): ResultadoOperacion<Cita> {
  const cita = repositorios().citas.buscarPorCodigo(codigo);
  if (!cita) return { ok: false, error: "La cita no existe." };
  if (!autorizar(actor, esDuenoDelRecurso(actor, cita.pacienteCorreo) || esMedicoDeLaCita(actor, cita.doctorId), `Intento de reprogramar ${codigo}`)) {
    return { ok: false, error: "No tienes permiso para reprogramar esta cita." };
  }
  // ===== INICIO MEJORA FUNCIONAL =====
  if (esFechaPasada(fecha)) {
    return { ok: false, error: "Esa fecha ya no se encuentra disponible. Elige otra fecha." };
  }
  // ===== FIN MEJORA FUNCIONAL =====
  const r = repositorios().citas.reprogramar(codigo, fecha, hora);
  if (!r.ok) return { ok: false, error: r.error };
  registrarAuditoria(actor.correo, "REPROGRAMACION_CITA", `${codigo} -> ${fecha} ${hora}`);
  return { ok: true, datos: r.cita };
}

/** Fecha de hoy en formato ISO local (helper de presentación). */
export const hoyISO = fechaLocalISO;
