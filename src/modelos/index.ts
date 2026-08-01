// ===== INICIO SOLID - SRP =====
// Capa de MODELOS: define únicamente la forma de los datos del dominio.
// No contiene lógica de negocio ni acceso a almacenamiento.
// Estos modelos representan 1:1 las futuras tablas MySQL.
// ===== FIN SOLID - SRP =====

export type { Cita, EstadoCita, NotaClinica } from "@/logica/citas";
export type { UsuarioRegistrado, SesionActiva, RolUsuario } from "@/logica/autenticacion";
export type { MedicoRegistro } from "@/datos/medicos_iniciales";
export type { Disponibilidad } from "@/logica/disponibilidad";
export type { RegistroAuditoria, AccionAuditada } from "@/seguridad/auditoria";
export type { Sede } from "@/datos/sedes";

/**
 * Correspondencia prevista con MySQL (referencia para la futura migración):
 *
 *   Cita               -> tabla `citas`         (PK codigo)
 *   UsuarioRegistrado  -> tabla `usuarios`      (PK correo, contrasena = hash BCrypt)
 *   MedicoRegistro     -> tabla `medicos`       (PK id, FK usuario)
 *   Disponibilidad     -> tabla `disponibilidad`(PK doctor_id)
 *   RegistroAuditoria  -> tabla `auditoria`     (PK id)
 */
export interface MapaTablasMySQL {
  citas: "citas";
  usuarios: "usuarios";
  medicos: "medicos";
  disponibilidad: "disponibilidad";
  auditoria: "auditoria";
}
