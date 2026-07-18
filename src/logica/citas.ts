// Datos y utilidades de citas. En Fase 1 se mantienen los seeds existentes
// para no romper el panel ni el historial; Fase 2 los reemplaza por citas reales.

export type EstadoCita =
  | "confirmada"
  | "pendiente"
  | "completada"
  | "cancelada"
  | "urgente";

export interface Cita {
  id: string;
  especialidad: string;
  doctor: string;
  ubicacion: string;
  fecha: string; // ISO
  hora: string;
  estado: EstadoCita;
  nota?: string;
}

export const ESPECIALIDADES = [
  "Medicina General",
  "Cardiología",
  "Dermatología",
  "Odontología",
  "Pediatría",
  "Oftalmología",
  "Ginecología",
  "Traumatología",
];

export const DOCTORES = [
  "Dra. Elena Rivas",
  "Dr. Julián Méndez",
  "Dra. Sara Valdés",
  "Dr. Roberto Salas",
  "Dra. Ana Soto",
  "Dr. Mario Vaca",
];

export const CITAS_PROXIMAS_SEMILLA: Cita[] = [
  {
    id: "u1",
    especialidad: "Cardiología",
    doctor: "Dr. Julián Méndez",
    ubicacion: "Torre Médica · Consultorio 304",
    fecha: new Date().toISOString().slice(0, 10),
    hora: "09:30",
    estado: "confirmada",
  },
  {
    id: "u2",
    especialidad: "Laboratorio · Análisis de sangre",
    doctor: "Módulo B-12",
    ubicacion: "Planta baja · Laboratorio",
    fecha: new Date().toISOString().slice(0, 10),
    hora: "15:15",
    estado: "pendiente",
  },
  {
    id: "u3",
    especialidad: "Oftalmología",
    doctor: "Dra. Elena Rivas",
    ubicacion: "Torre Médica · Consultorio 210",
    fecha: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    hora: "11:00",
    estado: "confirmada",
  },
];

export const HISTORIAL_SEMILLA: Cita[] = [
  {
    id: "h1",
    especialidad: "Medicina General",
    doctor: "Dr. Mario Vaca",
    ubicacion: "Chequeo anual",
    fecha: "2026-05-14",
    hora: "10:00",
    estado: "completada",
    nota: "Receta y resultados disponibles",
  },
  {
    id: "h2",
    especialidad: "Imagenología",
    doctor: "Radiografía de tórax",
    ubicacion: "Imagenología · Sala 2",
    fecha: "2026-04-02",
    hora: "08:45",
    estado: "completada",
    nota: "Resultados disponibles",
  },
  {
    id: "h3",
    especialidad: "Dermatología",
    doctor: "Dra. Ana Soto",
    ubicacion: "Torre Médica · Consultorio 118",
    fecha: "2026-03-20",
    hora: "16:30",
    estado: "completada",
  },
  {
    id: "h4",
    especialidad: "Nutrición",
    doctor: "Dra. Sara Valdés",
    ubicacion: "Bienestar · Consultorio 4",
    fecha: "2026-02-15",
    hora: "12:00",
    estado: "cancelada",
  },
  {
    id: "h5",
    especialidad: "Cardiología · Urgencia",
    doctor: "Dr. Roberto Salas",
    ubicacion: "Urgencias",
    fecha: "2026-01-08",
    hora: "21:40",
    estado: "urgente",
    nota: "Atención inmediata",
  },
];

export function formatearFechaLarga(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy.getTime() + 86400000);
  if (d.getTime() === hoy.getTime()) return "Hoy";
  if (d.getTime() === manana.getTime()) return "Mañana";
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function fechaCorta(iso: string): { dia: string; mes: string } {
  const d = new Date(iso + "T00:00:00");
  return {
    dia: d.toLocaleDateString("es-ES", { day: "2-digit" }),
    mes: d.toLocaleDateString("es-ES", { month: "short" }).replace(".", ""),
  };
}
