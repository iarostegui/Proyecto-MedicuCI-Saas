// ===== SOLID - SRP / DIP =====
// Cliente HTTP del frontend: única puerta de salida hacia la API.
// El navegador SÓLO conoce la URL de la API y su token JWT; jamás credenciales
// de la base de datos (OWASP A3/A6).
import { VARIABLES_ENTORNO } from "@/configuracion/variables_entorno";

const CLAVE_TOKEN = "medicu:token";

export function guardarToken(token: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(CLAVE_TOKEN, token);
}

export function obtenerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CLAVE_TOKEN);
}

export function borrarToken(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(CLAVE_TOKEN);
}

export class ErrorApi extends Error {
  constructor(
    public codigo: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

async function pedir<T>(
  metodo: string,
  ruta: string,
  datos?: unknown,
): Promise<T> {
  const rutaLimpia = ruta.startsWith("/") ? ruta.slice(1) : ruta;
  const token = obtenerToken();
  const respuesta = await fetch(`${VARIABLES_ENTORNO.urlApi || ""}/api${ruta}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: datos ? JSON.stringify(datos) : undefined,
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, (cuerpo as { error?: string }).error ?? "Error de red");
  }
  return cuerpo as T;
}

export const api = {
  get: <T>(ruta: string) => pedir<T>("GET", ruta),
  post: <T>(ruta: string, datos?: unknown) => pedir<T>("POST", ruta, datos),
  put: <T>(ruta: string, datos?: unknown) => pedir<T>("PUT", ruta, datos),
  patch: <T>(ruta: string, datos?: unknown) => pedir<T>("PATCH", ruta, datos),
  delete: <T>(ruta: string) => pedir<T>("DELETE", ruta),
};

// Atajos por dominio (ISP: cada vista usa sólo lo que necesita).
export const apiAuth = {
  registro: (datos: unknown) => api.post<{ token: string }>("/auth/registro", datos),
  login: (datos: unknown) => api.post<{ token: string }>("/auth/login", datos),
  perfil: () => api.get("/auth/perfil"),
};

export const apiCatalogos = {
  sedes: () => api.get("/sedes"),
  especialidades: (idSede?: number) =>
    api.get(`/especialidades${idSede ? `?idSede=${idSede}` : ""}`),
  medicos: (idSede?: number, idEspecialidad?: number) =>
    api.get(`/medicos?idSede=${idSede ?? ""}&idEspecialidad=${idEspecialidad ?? ""}`),
};

export const apiDisponibilidad = {
  fechas: (idMedico: number) => api.get(`/disponibilidad?idMedico=${idMedico}&soloFechas=1`),
  horarios: (idMedico: number, fecha: string) =>
    api.get(`/disponibilidad?idMedico=${idMedico}&fecha=${fecha}`),
};

export const apiCitas = {
  listar: () => api.get("/citas"),
  crear: (datos: unknown) => api.post("/citas", datos),
  cancelar: (id: number, motivo?: string) => api.patch(`/citas/${id}/cancelar`, { motivo }),
  reprogramar: (id: number, fecha: string, hora: string) =>
    api.patch(`/citas/${id}/reprogramar`, { fecha, hora }),
};

export const apiNotificaciones = {
  listar: () => api.get("/notificaciones"),
  marcarLeida: (id: number) => api.patch(`/notificaciones/${id}`),
};
