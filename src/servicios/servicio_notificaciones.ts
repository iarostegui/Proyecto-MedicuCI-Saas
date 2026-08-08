// ===== INICIO SOLID - SRP =====
// SERVICIO DE NOTIFICACIONES: única responsabilidad = recordatorios y avisos.
// ===== FIN SOLID - SRP =====
// FUTURA CONEXIÓN MYSQL: tabla `notificaciones` + endpoint /api/notificaciones.
export {
  contarNoLeidas,
  leidasDe,
  marcarLeidas,
  notificacionesDe,
} from "@/logica/notificaciones";

export type { Notificacion, TipoNotificacion } from "@/logica/notificaciones";
