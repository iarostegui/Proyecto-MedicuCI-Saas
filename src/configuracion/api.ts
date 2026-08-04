// Punto único de configuración de la futura API MySQL.
// FUTURA CONEXIÓN MYSQL
// Aquí se definirá el cliente HTTP que consumirá el backend con MySQL.
import { VARIABLES_ENTORNO } from "@/configuracion/variables_entorno";

export const RUTAS_API = {
  usuarios: "/api/usuarios",
  citas: "/api/citas",
  medicos: "/api/medicos",
  disponibilidad: "/api/disponibilidad",
} as const;

export function url_api(ruta: string): string {
  return `${VARIABLES_ENTORNO.urlApi}${ruta}`;
}
