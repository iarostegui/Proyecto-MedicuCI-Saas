// Agregaciones básicas sobre las citas para el panel de reportes.
import { obtenerCitas, ESTADOS_CITA, type Cita, type EstadoCita } from "@/logica/citas";
import { obtenerMedicos } from "@/logica/autenticacion";
import { SEDES } from "@/datos/sedes";

export interface Conteo {
  clave: string;
  valor: number;
}

export interface ResumenReportes {
  total: number;
  urgentes: number;
  porEstado: Conteo[];
  porSede: Conteo[];
  porEspecialidad: Conteo[];
  porMedico: Conteo[];
  ultimosDias: Conteo[]; // últimos 14 días
}

function contarPor<T>(lista: Cita[], key: (c: Cita) => string, universo: string[]): Conteo[] {
  const map = new Map<string, number>();
  universo.forEach((u) => map.set(u, 0));
  lista.forEach((c) => {
    const k = key(c);
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([clave, valor]) => ({ clave, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function generarReporte(filtro?: {
  desde?: string;
  hasta?: string;
  sede?: string;
}): ResumenReportes {
  let lista = obtenerCitas();
  if (filtro?.desde) lista = lista.filter((c) => c.fecha >= filtro.desde!);
  if (filtro?.hasta) lista = lista.filter((c) => c.fecha <= filtro.hasta!);
  if (filtro?.sede) lista = lista.filter((c) => c.sede === filtro.sede);

  const medicos = obtenerMedicos();
  const especialidades = Array.from(new Set(medicos.map((m) => m.especialidad)));
  const nombresMedicos = medicos.map((m) => m.nombre);

  // Últimos 14 días
  const dias: string[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i--) {
    const d = new Date(hoy.getTime() - i * 86400000);
    dias.push(d.toISOString().slice(0, 10));
  }
  const mapDias = new Map<string, number>(dias.map((d) => [d, 0]));
  lista.forEach((c) => {
    if (mapDias.has(c.fecha)) mapDias.set(c.fecha, (mapDias.get(c.fecha) ?? 0) + 1);
  });

  return {
    total: lista.length,
    urgentes: lista.filter((c) => c.esUrgente).length,
    porEstado: contarPor(lista, (c) => c.estado, ESTADOS_CITA as unknown as string[]),
    porSede: contarPor(lista, (c) => c.sede, [...SEDES]),
    porEspecialidad: contarPor(lista, (c) => c.especialidad, especialidades),
    porMedico: contarPor(lista, (c) => c.doctorNombre, nombresMedicos),
    ultimosDias: [...mapDias.entries()].map(([clave, valor]) => ({ clave, valor })),
  };
}

export function contarPorEstado(): Record<EstadoCita, number> {
  const r = generarReporte();
  const out = { Programada: 0, Reprogramada: 0, Cancelada: 0, Atendida: 0 } as Record<EstadoCita, number>;
  r.porEstado.forEach((c) => (out[c.clave as EstadoCita] = c.valor));
  return out;
}
