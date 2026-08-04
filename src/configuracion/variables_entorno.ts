// OWASP A6 — configuración segura: los valores sensibles vienen del entorno.
import { CONFIG } from "@/seguridad/configuracion";

const env =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const VARIABLES_ENTORNO = {
  nombreApp: CONFIG.nombreApp,
  entorno: CONFIG.entorno,
  // FUTURA CONEXIÓN MYSQL
  // URL base del backend que expondrá las consultas SQL.
  urlApi: env["VITE_URL_API"] ?? "",
  minutosToken: CONFIG.minutosExpiracionToken,
  diasAgendaVisibles: CONFIG.diasAgendaVisibles,
} as const;
