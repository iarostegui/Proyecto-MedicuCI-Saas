import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HeartPulse } from "lucide-react";
import { inicializarAlmacen, obtenerSesion } from "@/servicios/servicio_sesion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medicu CI" },
      { name: "description", content: "Accede a tu cuenta Medicu CI." },
    ],
  }),
  component: Pagina_Redireccion,
});

function Pagina_Redireccion() {
  const navigate = useNavigate();

  useEffect(() => {
    inicializarAlmacen();
    const sesion = obtenerSesion();
    if (!sesion) {
      navigate({ to: "/inicio_sesion", replace: true });
      return;
    }
    if (sesion.rol === "Medico") {
      navigate({ to: "/panel_medico", replace: true });
    } else if (sesion.rol === "Admin") {
      navigate({ to: "/panel_admin", replace: true });
    } else {
      navigate({ to: "/panel_principal", replace: true });
    }

  }, [navigate]);

  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex items-center gap-2 text-primary">
        <HeartPulse className="size-6 animate-pulse" />
        <span className="text-lg font-bold">Medicu CI</span>
      </div>
    </div>
  );
}
