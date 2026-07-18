import { useCallback, useEffect, useState } from "react";
import {
  limpiarSesion,
  obtenerSesion,
  type SesionActiva,
} from "@/logica/autenticacion";

/** Hook central de sesión: expone el usuario activo y una función para cerrar sesión. */
export function useSesion() {
  const [usuario, setUsuario] = useState<SesionActiva | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setUsuario(obtenerSesion());
    setCargando(false);
  }, []);

  const cerrarSesion = useCallback(() => {
    limpiarSesion();
    setUsuario(null);
  }, []);

  return { usuario, rol: usuario?.rol ?? null, cargando, cerrarSesion };
}
