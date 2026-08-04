// SOLID - SRP
// Este servicio solo administra usuarios y su sesión.
// OWASP A2 — las contraseñas se almacenan hasheadas (ver seguridad/hash_contrasena.ts).
import { repositorios } from "@/repositorios/contenedor";
import type { UsuarioRegistrado } from "@/modelos";

// FUTURA CONEXIÓN MYSQL
// Aquí se reemplazarán los datos simulados por consultas SQL sobre `usuarios`.

export function listar_usuarios(): UsuarioRegistrado[] {
  return repositorios().usuarios.listar();
}

export function usuario_por_correo(correo: string): UsuarioRegistrado | undefined {
  return repositorios().usuarios.buscarPorCorreo(correo);
}

export function crear_usuario(usuario: UsuarioRegistrado): void {
  repositorios().usuarios.crear(usuario);
}

export function actualizar_usuario(correo: string, cambios: Partial<UsuarioRegistrado>): void {
  repositorios().usuarios.actualizar(correo, cambios);
}
