import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Stethoscope, MapPin, Briefcase } from "lucide-react";
import { Cascara_App } from "@/components/Cascara_App";
import { obtenerSesion, type SesionActiva } from "@/logica/autenticacion";

export const Route = createFileRoute("/panel_medico")({
  head: () => ({
    meta: [
      { title: "Panel médico · Medicu CI" },
      {
        name: "description",
        content: "Espacio exclusivo para el personal médico de Medicu CI.",
      },
    ],
  }),
  component: Pagina_Panel_Medico,
});

function Pagina_Panel_Medico() {
  const navigate = useNavigate();
  const [sesion, setSesion] = useState<SesionActiva | null>(null);

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      navigate({ to: "/inicio_sesion" });
      return;
    }
    if (s.rol !== "Medico") {
      navigate({ to: "/panel_principal" });
      return;
    }
    setSesion(s);
  }, [navigate]);

  if (!sesion) return null;

  return (
    <Cascara_App>
      <section className="mb-8">
        <p className="text-sm font-medium text-primary">Bienvenido/a</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {sesion.nombre}
        </h1>
        <p className="mt-1 text-muted-foreground">Panel exclusivo del personal médico.</p>
      </section>

      <div className="rounded-2xl border border-dashed border-primary/40 bg-primary-soft/40 p-8 text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
          <Stethoscope className="size-6" />
        </div>
        <h2 className="text-lg font-bold">Panel médico en construcción</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Muy pronto podrás ver tus citas asignadas, filtrar por sede o fecha y
          gestionar tu disponibilidad desde aquí.
        </p>

        <div className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Briefcase className="size-4 text-primary" />
            Rol: Médico
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            Correo: {sesion.correo}
          </p>
        </div>
      </div>
    </Cascara_App>
  );
}
