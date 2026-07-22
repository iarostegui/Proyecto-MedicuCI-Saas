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

export function citasACSV(citas: Cita[]): string {
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
  return [headers.join(","), ...rows].join("\n");
}

export function exportarCitasCSV(citas?: Cita[], nombre = "medicu_citas") {
  const csv = citasACSV(citas ?? obtenerCitas());
  descargarBlob(`${nombre}_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
}

/** Abre una ventana con formato imprimible del listado de citas. */
export function imprimirCitas(citas: Cita[], titulo = "Listado de citas") {
  const filas = citas
    .map(
      (c) => `<tr>
        <td>${c.codigo}</td>
        <td>${c.fecha} ${c.hora}</td>
        <td>${escapeHtml(c.pacienteNombre)}</td>
        <td>${escapeHtml(c.especialidad)}</td>
        <td>${escapeHtml(c.sede)}</td>
        <td>${c.estado}</td>
        <td>${escapeHtml(c.observaciones ?? "")}</td>
      </tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(titulo)}</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}
      h1{margin:0 0 4px;font-size:20px}
      p.sub{margin:0 0 16px;color:#64748b;font-size:12px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#f1f5f9}
    </style></head><body>
    <h1>${escapeHtml(titulo)}</h1>
    <p class="sub">Generado el ${new Date().toLocaleString("es-ES")} — ${citas.length} cita(s)</p>
    <table><thead><tr>
      <th>Código</th><th>Fecha</th><th>Paciente</th><th>Especialidad</th><th>Sede</th><th>Estado</th><th>Observaciones</th>
    </tr></thead><tbody>${filas}</tbody></table>
    <script>window.onload=()=>{window.print()}</script>
  </body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c] as string);
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
