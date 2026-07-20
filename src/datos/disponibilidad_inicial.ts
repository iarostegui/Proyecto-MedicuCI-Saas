// Disponibilidad inicial por médico. Distinta para cada uno para que el
// sistema deba filtrar dinámicamente qué especialidades y qué doctores tienen
// realmente cupo al momento de agendar.
import type { Disponibilidad } from "@/logica/disponibilidad";

type Plantilla = Omit<Disponibilidad, "doctorId">;

export const DISPONIBILIDAD_INICIAL: Record<string, Plantilla> = {
  // Lima
  med_jimmy:   { diasSemana: [1, 3, 5],        fechasBloqueadas: [], horaInicio: "08:00", horaFin: "13:00", duracionMin: 30 },
  med_lucia:   { diasSemana: [1, 2, 3, 4, 5],  fechasBloqueadas: [], horaInicio: "09:00", horaFin: "17:00", duracionMin: 20 },
  med_rosa:    { diasSemana: [2, 4],           fechasBloqueadas: [], horaInicio: "14:00", horaFin: "19:00", duracionMin: 30 },

  // San Borja
  med_mirella: { diasSemana: [1, 2, 4, 5],     fechasBloqueadas: [], horaInicio: "08:30", horaFin: "14:00", duracionMin: 30 },
  med_carla:   { diasSemana: [3, 6],           fechasBloqueadas: [], horaInicio: "10:00", horaFin: "16:00", duracionMin: 45 },
  med_pablo:   { diasSemana: [1, 2, 3, 4, 5],  fechasBloqueadas: [], horaInicio: "07:00", horaFin: "12:00", duracionMin: 20 },

  // Mediocentro San Isidro
  med_andres:  { diasSemana: [1, 2, 3, 4, 5],  fechasBloqueadas: [], horaInicio: "08:00", horaFin: "16:00", duracionMin: 25 },
  med_soledad: { diasSemana: [2, 4, 6],        fechasBloqueadas: [], horaInicio: "09:00", horaFin: "13:00", duracionMin: 45 },
  med_marco:   { diasSemana: [1, 3, 5],        fechasBloqueadas: [], horaInicio: "15:00", horaFin: "20:00", duracionMin: 30 },

  // Surco El Polo
  med_hector:  { diasSemana: [1, 2, 3, 4, 5],  fechasBloqueadas: [], horaInicio: "08:00", horaFin: "17:00", duracionMin: 30 },
  med_paola:   { diasSemana: [3, 4, 5],        fechasBloqueadas: [], horaInicio: "09:00", horaFin: "14:00", duracionMin: 30 },
  med_ivan:    { diasSemana: [1, 5, 6],        fechasBloqueadas: [], horaInicio: "10:00", horaFin: "18:00", duracionMin: 40 },

  // La Molina
  med_david:   { diasSemana: [2, 3, 4],        fechasBloqueadas: [], horaInicio: "09:00", horaFin: "15:00", duracionMin: 30 },
  med_valeria: { diasSemana: [1, 4, 5],        fechasBloqueadas: [], horaInicio: "11:00", horaFin: "18:00", duracionMin: 30 },
};
