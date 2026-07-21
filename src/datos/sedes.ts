export const SEDES = [
  "Lima",
  "San Borja",
  "Mediocentro San Isidro",
  "Surco El Polo",
  "La Molina",
] as const;

// Tipo relajado para permitir sedes creadas por el administrador.
export type Sede = string;

