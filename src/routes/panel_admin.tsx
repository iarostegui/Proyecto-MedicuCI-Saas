import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  UserPlus,
  Pencil,
  Trash2,
  Download,
  DatabaseBackup,
  Upload,
  Users,
  Stethoscope,
} from "lucide-react";
import { Cascara_App } from "@/components/Cascara_App";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  obtenerSesion,
  obtenerMedicos,
  obtenerUsuarios,
  upsertMedico,
  eliminarMedico,
} from "@/logica/autenticacion";
import type { MedicoRegistro } from "@/datos/medicos_iniciales";
import { SEDES } from "@/datos/sedes";
import {
  descargarRespaldoJSON,
  exportarCitasCSV,
  exportarPacientesCSV,
  restaurarRespaldoJSON,
} from "@/logica/exportar";
import { toast } from "sonner";

export const Route = createFileRoute("/panel_admin")({
  head: () => ({
    meta: [
      { title: "Administración · Medicu CI" },
      { name: "description", content: "Panel administrativo del sistema Medicu CI." },
    ],
  }),
  component: Pagina_Panel_Admin,
});

type FormMedico = Omit<MedicoRegistro, "rol">;

const EN_BLANCO: FormMedico = {
  id: "",
  nombre: "",
  correo: "",
  contrasena: "Medicu2026",
  especialidad: "",
  sede: SEDES[0],
};

function Pagina_Panel_Admin() {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState<MedicoRegistro[]>([]);
  const [pacientes, setPacientes] = useState<number>(0);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<{ modo: "nuevo" | "editar"; data: FormMedico } | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState<MedicoRegistro | null>(null);

  function recargar() {
    setMedicos(obtenerMedicos());
    setPacientes(obtenerUsuarios().length);
  }

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      navigate({ to: "/inicio_sesion" });
      return;
    }
    if (s.rol !== "Admin") {
      navigate({ to: "/" });
      return;
    }
    recargar();
  }, [navigate]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return medicos;
    return medicos.filter((m) =>
      (m.nombre + " " + m.correo + " " + m.especialidad + " " + m.sede)
        .toLowerCase()
        .includes(q),
    );
  }, [medicos, busqueda]);

  const sedesConMedicos = useMemo(
    () => Array.from(new Set([...SEDES, ...medicos.map((m) => m.sede)])),
    [medicos],
  );

  function abrirNuevo() {
    setModal({ modo: "nuevo", data: { ...EN_BLANCO, id: `med_${Date.now()}` } });
  }
  function abrirEditar(m: MedicoRegistro) {
    setModal({ modo: "editar", data: { ...m } });
  }

  function guardar() {
    if (!modal) return;
    const d = modal.data;
    if (!d.nombre.trim() || !d.correo.trim() || !d.especialidad.trim() || !d.sede) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo)) {
      toast.error("Correo inválido.");
      return;
    }
    upsertMedico({ ...d, rol: "Medico" });
    toast.success(modal.modo === "nuevo" ? "Médico creado" : "Médico actualizado");
    setModal(null);
    recargar();
  }

  function borrar() {
    if (!confirmarBorrar) return;
    eliminarMedico(confirmarBorrar.id);
    toast.success("Médico eliminado");
    setConfirmarBorrar(null);
    recargar();
  }

  async function restaurar(file: File) {
    const texto = await file.text();
    const r = restaurarRespaldoJSON(texto);
    if (!r.ok) {
      toast.error("No se pudo restaurar: " + r.error);
      return;
    }
    toast.success(`Restaurado (${r.claves.length} claves). Recarga para ver los cambios.`);
    recargar();
  }

  return (
    <Cascara_App>
      <section className="mb-6">
        <p className="text-sm font-medium text-primary">Administración</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Panel del sistema
        </h1>
        <p className="mt-1 text-muted-foreground">
          Gestiona médicos, sedes, especialidades y respaldos del sistema.
        </p>
      </section>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Tarjeta icon={<Stethoscope className="size-5" />} etiqueta="Médicos" valor={medicos.length} />
        <Tarjeta icon={<Users className="size-5" />} etiqueta="Pacientes registrados" valor={pacientes} />
        <Tarjeta icon={<DatabaseBackup className="size-5" />} etiqueta="Sedes activas" valor={sedesConMedicos.length} />
      </div>

      {/* Exportaciones y respaldo */}
      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card p-4">
        <Button variant="outline" onClick={exportarCitasCSV}>
          <Download className="size-4" /> Exportar citas CSV
        </Button>
        <Button variant="outline" onClick={exportarPacientesCSV}>
          <Download className="size-4" /> Exportar pacientes CSV
        </Button>
        <Button variant="outline" onClick={descargarRespaldoJSON}>
          <DatabaseBackup className="size-4" /> Respaldo JSON
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">
          <Upload className="size-4" /> Restaurar respaldo
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) restaurar(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* Médicos */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Médicos</h2>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar…"
          className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm sm:max-w-xs"
        />
        <Button onClick={abrirNuevo}>
          <UserPlus className="size-4" /> Nuevo médico
        </Button>
      </div>

      <ul className="space-y-2">
        {filtrados.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.especialidad} · {m.sede} · {m.correo}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => abrirEditar(m)}>
              <Pencil className="size-4" /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => setConfirmarBorrar(m)}
            >
              <Trash2 className="size-4" /> Eliminar
            </Button>
          </li>
        ))}
        {filtrados.length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No hay médicos con esos criterios.
          </li>
        )}
      </ul>

      {/* Modal médico */}
      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modal?.modo === "nuevo" ? "Nuevo médico" : "Editar médico"}
            </DialogTitle>
            <DialogDescription>
              Los cambios se aplican al instante. La disponibilidad por defecto se creará automáticamente.
            </DialogDescription>
          </DialogHeader>
          {modal && (
            <div className="space-y-3 py-1">
              <CampoTexto
                label="Nombre completo"
                value={modal.data.nombre}
                onChange={(v) => setModal({ ...modal, data: { ...modal.data, nombre: v } })}
              />
              <CampoTexto
                label="Correo institucional"
                value={modal.data.correo}
                onChange={(v) => setModal({ ...modal, data: { ...modal.data, correo: v } })}
              />
              <CampoTexto
                label="Contraseña"
                value={modal.data.contrasena}
                onChange={(v) => setModal({ ...modal, data: { ...modal.data, contrasena: v } })}
              />
              <CampoTexto
                label="Especialidad"
                value={modal.data.especialidad}
                onChange={(v) =>
                  setModal({ ...modal, data: { ...modal.data, especialidad: v } })
                }
              />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Sede
                </span>
                <input
                  list="lista-sedes"
                  value={modal.data.sede}
                  onChange={(e) =>
                    setModal({ ...modal, data: { ...modal.data, sede: e.target.value } })
                  }
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
                <datalist id="lista-sedes">
                  {sedesConMedicos.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar borrar */}
      <Dialog open={!!confirmarBorrar} onOpenChange={(o) => !o && setConfirmarBorrar(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar médico</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Las citas históricas se conservan.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-lg bg-secondary/60 p-3 text-sm">
            {confirmarBorrar?.nombre} · {confirmarBorrar?.especialidad}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmarBorrar(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={borrar}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Cascara_App>
  );
}

function Tarjeta({
  icon,
  etiqueta,
  valor,
}: {
  icon: React.ReactNode;
  etiqueta: string;
  valor: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)]">
      <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
        <p className="text-2xl font-extrabold">{valor}</p>
      </div>
    </div>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
      />
    </label>
  );
}
