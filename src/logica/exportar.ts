// Exportaciones (CSV) y respaldo/restauración completa del LocalStorage Medicu.
import { obtenerCitas, reemplazarCitas, type Cita } from "@/logica/citas";
import { obtenerUsuarios } from "@/logica/autenticacion";

function descargarBlob(nombre: string, contenido: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportarCitasCSV() {
  const citas = obtenerCitas();
  const headers = [
    "codigo",
    "estado",
    "fecha",
    "hora",
    "sede",
    "especialidad",
    "doctor",
    "paciente",
    "correo",
    "urgente",
    "motivoCancelacion",
    "observaciones",
    "creada",
  ];
  const rows = citas.map((c: Cita) =>
    [
      c.codigo,
      c.estado,
      c.fecha,
      c.hora,
      c.sede,
      c.especialidad,
      c.doctorNombre,
      c.pacienteNombre,
      c.pacienteCorreo,
      c.esUrgente ? "Sí" : "No",
      c.motivoCancelacion ?? "",
      c.observaciones ?? "",
      c.fechaCreacion,
    ]
      .map(csvEscape)
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  descargarBlob(`medicu_citas_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
}

export function exportarPacientesCSV() {
  const usuarios = obtenerUsuarios();
  const headers = ["nombre", "dni", "correo", "fechaEmision", "preferencias"];
  const rows = usuarios.map((u) =>
    [
      u.nombre,
      u.dni,
      u.correo,
      u.fechaEmision,
      (u.especialidades ?? []).join("; "),
    ]
      .map(csvEscape)
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  descargarBlob(`medicu_pacientes_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
}

const CLAVES_RESPALDO = [
  "medicu:usuarios",
  "medicu:medicos",
  "medicu:citas",
  "medicu:disponibilidad",
] as const;

export function generarRespaldoJSON(): string {
  const s = window.localStorage;
  const dump: Record<string, unknown> = {};
  for (const k of CLAVES_RESPALDO) {
    const raw = s.getItem(k);
    dump[k] = raw ? JSON.parse(raw) : null;
  }
  return JSON.stringify({ version: 1, generadoEn: new Date().toISOString(), datos: dump }, null, 2);
}

export function descargarRespaldoJSON() {
  descargarBlob(`medicu_respaldo_${Date.now()}.json`, generarRespaldoJSON(), "application/json");
}

export function restaurarRespaldoJSON(texto: string):
  | { ok: true; claves: string[] }
  | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(texto) as { datos?: Record<string, unknown> };
    if (!parsed?.datos) return { ok: false, error: "Formato de respaldo inválido." };
    const s = window.localStorage;
    const restauradas: string[] = [];
    for (const k of CLAVES_RESPALDO) {
      if (k in parsed.datos && parsed.datos[k] != null) {
        s.setItem(k, JSON.stringify(parsed.datos[k]));
        restauradas.push(k);
      }
    }
    // Compatibilidad: si citas fueron restauradas, reemplaza vía API oficial.
    if (parsed.datos["medicu:citas"]) {
      reemplazarCitas(parsed.datos["medicu:citas"] as Cita[]);
    }
    return { ok: true, claves: restauradas };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
