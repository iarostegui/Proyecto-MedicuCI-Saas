// Modelo de dominio: usuario. Refleja la futura tabla MySQL `usuarios`.
export type { UsuarioRegistrado, SesionActiva, RolUsuario } from "@/modelos";

export const TABLA_USUARIOS = "usuarios" as const;
