// ===== INICIO SOLID - DIP =====
// Dependency Inversion: los SERVICIOS dependen de las INTERFACES de repositorio,
// nunca de una implementación concreta. Este contenedor resuelve qué
// implementación se usa en tiempo de ejecución.
//
// Para migrar a MySQL basta con registrar aquí los repositorios MySQL:
//   registrarRepositorios({ citas: repositorioCitasMySQL, ... })
// sin tocar ni un componente ni un servicio.
// ===== FIN SOLID - DIP =====
//
// ===== INICIO SOLID - OCP =====
// Open/Closed: se pueden AGREGAR nuevas implementaciones sin MODIFICAR las
// existentes ni los consumidores.
// ===== FIN SOLID - OCP =====
import type {
  IRepositorioCitas,
  IRepositorioDisponibilidad,
  IRepositorioMedicos,
  IRepositorioUsuarios,
} from "@/repositorios/interfaces";
import {
  repositorioCitasLocal,
  repositorioDisponibilidadLocal,
  repositorioMedicosLocal,
  repositorioUsuariosLocal,
} from "@/repositorios/local/repositorios_local";

export interface ContenedorRepositorios {
  citas: IRepositorioCitas;
  usuarios: IRepositorioUsuarios;
  medicos: IRepositorioMedicos;
  disponibilidad: IRepositorioDisponibilidad;
}

let contenedor: ContenedorRepositorios = {
  citas: repositorioCitasLocal,
  usuarios: repositorioUsuariosLocal,
  medicos: repositorioMedicosLocal,
  disponibilidad: repositorioDisponibilidadLocal,
};

/** Sustituye una o varias implementaciones (p. ej. al conectar MySQL o en tests). */
export function registrarRepositorios(parciales: Partial<ContenedorRepositorios>): void {
  contenedor = { ...contenedor, ...parciales };
}

export function repositorios(): ContenedorRepositorios {
  return contenedor;
}
