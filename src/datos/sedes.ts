export const SEDES = [
  "Lima",
  "San Borja",
  "Mediocentro San Isidro",
  "Surco El Polo",
  "La Molina",
] as const;

export type Sede = (typeof SEDES)[number];
