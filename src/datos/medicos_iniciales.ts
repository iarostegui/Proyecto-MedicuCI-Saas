import type { Sede } from "./sedes";

export interface MedicoRegistro {
  id: string;
  nombre: string;
  correo: string;
  contrasena: string;
  especialidad: string;
  sede: Sede;
  rol: "Medico";
}

export const MEDICOS_INICIALES: MedicoRegistro[] = [
  {
    id: "med_jimmy",
    nombre: "Dr. Jimmy Paredes",
    correo: "jimmy@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Cardiología",
    sede: "Lima",
    rol: "Medico",
  },
  {
    id: "med_mirella",
    nombre: "Dra. Mirella Cornejo",
    correo: "mirella@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Pediatría",
    sede: "San Borja",
    rol: "Medico",
  },
  {
    id: "med_andres",
    nombre: "Dr. Andrés Molina",
    correo: "andres@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Medicina General",
    sede: "Mediocentro San Isidro",
    rol: "Medico",
  },
  {
    id: "med_hector",
    nombre: "Dr. Héctor Ramírez",
    correo: "hector@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Traumatología",
    sede: "Surco El Polo",
    rol: "Medico",
  },
  {
    id: "med_david",
    nombre: "Dr. David Alcántara",
    correo: "david@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Dermatología",
    sede: "La Molina",
    rol: "Medico",
  },
];

export const DOMINIO_INSTITUCIONAL = "@medicu.ci.com";
