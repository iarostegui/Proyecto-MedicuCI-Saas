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

// Distribución intencionalmente desigual: no todas las sedes tienen todas las
// especialidades y algunas especialidades tienen varios médicos.
export const MEDICOS_INICIALES: MedicoRegistro[] = [
  // --- Lima ---
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
    id: "med_lucia",
    nombre: "Dra. Lucía Vargas",
    correo: "lucia@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Medicina General",
    sede: "Lima",
    rol: "Medico",
  },
  {
    id: "med_rosa",
    nombre: "Dra. Rosa Núñez",
    correo: "rosa@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Ginecología",
    sede: "Lima",
    rol: "Medico",
  },

  // --- San Borja ---
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
    id: "med_carla",
    nombre: "Dra. Carla Espinoza",
    correo: "carla@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Dermatología",
    sede: "San Borja",
    rol: "Medico",
  },
  {
    id: "med_pablo",
    nombre: "Dr. Pablo Reyes",
    correo: "pablo@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Medicina General",
    sede: "San Borja",
    rol: "Medico",
  },

  // --- Mediocentro San Isidro ---
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
    id: "med_soledad",
    nombre: "Dra. Soledad Ríos",
    correo: "soledad@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Neurología",
    sede: "Mediocentro San Isidro",
    rol: "Medico",
  },
  {
    id: "med_marco",
    nombre: "Dr. Marco Tello",
    correo: "marco@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Cardiología",
    sede: "Mediocentro San Isidro",
    rol: "Medico",
  },

  // --- Surco El Polo ---
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
    id: "med_paola",
    nombre: "Dra. Paola Suárez",
    correo: "paola@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Pediatría",
    sede: "Surco El Polo",
    rol: "Medico",
  },
  {
    id: "med_ivan",
    nombre: "Dr. Iván Delgado",
    correo: "ivan@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Oftalmología",
    sede: "Surco El Polo",
    rol: "Medico",
  },

  // --- La Molina ---
  {
    id: "med_david",
    nombre: "Dr. David Alcántara",
    correo: "david@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Dermatología",
    sede: "La Molina",
    rol: "Medico",
  },
  {
    id: "med_valeria",
    nombre: "Dra. Valeria Ochoa",
    correo: "valeria@medicu.ci.com",
    contrasena: "Medicu2026",
    especialidad: "Ginecología",
    sede: "La Molina",
    rol: "Medico",
  },
];

export const DOMINIO_INSTITUCIONAL = "@medicu.ci.com";
