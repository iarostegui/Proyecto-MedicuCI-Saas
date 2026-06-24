export type AppointmentStatus = "confirmada" | "pendiente" | "completada" | "cancelada" | "urgente";

export interface Appointment {
  id: string;
  specialty: string;
  doctor: string;
  location: string;
  date: string; // ISO date
  time: string;
  status: AppointmentStatus;
  note?: string;
}

export const specialties = [
  "Medicina General",
  "Cardiología",
  "Dermatología",
  "Odontología",
  "Pediatría",
  "Oftalmología",
  "Ginecología",
  "Traumatología",
];

export const doctors = [
  "Dra. Elena Rivas",
  "Dr. Julián Méndez",
  "Dra. Sara Valdés",
  "Dr. Roberto Salas",
  "Dra. Ana Soto",
  "Dr. Mario Vaca",
];

export const upcomingSeed: Appointment[] = [
  {
    id: "u1",
    specialty: "Cardiología",
    doctor: "Dr. Julián Méndez",
    location: "Torre Médica · Consultorio 304",
    date: new Date().toISOString().slice(0, 10),
    time: "09:30",
    status: "confirmada",
  },
  {
    id: "u2",
    specialty: "Laboratorio · Análisis de sangre",
    doctor: "Módulo B-12",
    location: "Planta baja · Laboratorio",
    date: new Date().toISOString().slice(0, 10),
    time: "15:15",
    status: "pendiente",
  },
  {
    id: "u3",
    specialty: "Oftalmología",
    doctor: "Dra. Elena Rivas",
    location: "Torre Médica · Consultorio 210",
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: "11:00",
    status: "confirmada",
  },
];

export const historySeed: Appointment[] = [
  {
    id: "h1",
    specialty: "Medicina General",
    doctor: "Dr. Mario Vaca",
    location: "Chequeo anual",
    date: "2026-05-14",
    time: "10:00",
    status: "completada",
    note: "Receta y resultados disponibles",
  },
  {
    id: "h2",
    specialty: "Imagenología",
    doctor: "Radiografía de tórax",
    location: "Imagenología · Sala 2",
    date: "2026-04-02",
    time: "08:45",
    status: "completada",
    note: "Resultados disponibles",
  },
  {
    id: "h3",
    specialty: "Dermatología",
    doctor: "Dra. Ana Soto",
    location: "Torre Médica · Consultorio 118",
    date: "2026-03-20",
    time: "16:30",
    status: "completada",
  },
  {
    id: "h4",
    specialty: "Nutrición",
    doctor: "Dra. Sara Valdés",
    location: "Bienestar · Consultorio 4",
    date: "2026-02-15",
    time: "12:00",
    status: "cancelada",
  },
  {
    id: "h5",
    specialty: "Cardiología · Urgencia",
    doctor: "Dr. Roberto Salas",
    location: "Urgencias",
    date: "2026-01-08",
    time: "21:40",
    status: "urgente",
    note: "Atención inmediata",
  },
];

export function formatLongDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  if (d.getTime() === today.getTime()) return "Hoy";
  if (d.getTime() === tomorrow.getTime()) return "Mañana";
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function shortDate(iso: string): { day: string; month: string } {
  const d = new Date(iso + "T00:00:00");
  return {
    day: d.toLocaleDateString("es-ES", { day: "2-digit" }),
    month: d.toLocaleDateString("es-ES", { month: "short" }).replace(".", ""),
  };
}
