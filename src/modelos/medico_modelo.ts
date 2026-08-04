// Modelo de dominio: médico. Refleja la futura tabla MySQL `medicos`.
export type { MedicoRegistro, Disponibilidad, Sede } from "@/modelos";

export const TABLA_MEDICOS = "medicos" as const;
