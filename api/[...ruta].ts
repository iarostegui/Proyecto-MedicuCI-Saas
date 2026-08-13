// ===== SOLID - SRP / OCP =====
// Único punto de entrada HTTP (Vercel Serverless Function, runtime Node).
// Sólo rutea: la lógica vive en api/servicios/*. Se amplía agregando casos,
// sin modificar los servicios existentes.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cuerpo, json, manejar, segmentos } from "./_lib/http";
import { ErrorHttp, exigirSesion } from "./_lib/seguridad";
import * as usuarios from "./servicios/usuarios";
import * as catalogos from "./servicios/catalogos";
import * as disponibilidad from "./servicios/disponibilidad";
import * as citas from "./servicios/citas";
import * as notificaciones from "./servicios/notificaciones";
import * as historial from "./servicios/historial";
import * as administracion from "./servicios/administracion";

function q(req: VercelRequest, nombre: string): string | undefined {
  const valor = req.query[nombre];
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const [recurso, id, sub] = segmentos(req);
  const metodo = req.method ?? "GET";

  await manejar(res, async () => {
    switch (recurso) {
      case "salud":
        // ?db=1 verifica además la conexión real a MySQL (paso 11).
        if (q(req, "db")) return administracion.diagnostico();
        return { ok: true, servicio: "medicu-ci-api" };

      // ---------- AUTENTICACIÓN / PACIENTES ----------
      case "auth":
        if (metodo === "POST" && id === "registro") return usuarios.registrarPaciente(cuerpo(req));
        if (metodo === "POST" && id === "login") return usuarios.iniciarSesion(cuerpo(req));
        if (metodo === "GET" && id === "perfil") return usuarios.perfilPropio(exigirSesion(req));
        if (metodo === "PUT" && id === "perfil")
          return usuarios.actualizarPerfil(exigirSesion(req), cuerpo(req));
        break;

      // ---------- CATÁLOGOS ----------
      case "sedes":
        if (metodo === "GET") return catalogos.listarSedes();
        break;
      case "especialidades":
        if (metodo === "GET") return catalogos.listarEspecialidades(q(req, "idSede"));
        break;
      case "medicos":
        if (metodo === "GET" && !id)
          return catalogos.listarMedicos({
            idSede: q(req, "idSede"),
            idEspecialidad: q(req, "idEspecialidad"),
          });
        if (metodo === "GET" && id) return catalogos.buscarMedico(id);
        break;

      // ---------- DISPONIBILIDAD ----------
      case "disponibilidad":
        if (metodo === "GET" && q(req, "idMedico")) {
          const idMedico = q(req, "idMedico")!;
          if (q(req, "fecha")) return disponibilidad.horariosLibres(idMedico, q(req, "fecha")!);
          if (q(req, "soloFechas")) return disponibilidad.fechasLibres(idMedico);
          return disponibilidad.franjasDeMedico(idMedico, q(req, "desde"), q(req, "hasta"));
        }
        if (metodo === "POST" && id === "generar")
          return disponibilidad.generarAgenda(exigirSesion(req, ["Medico"]), cuerpo(req));
        if (metodo === "POST") return disponibilidad.crearFranja(exigirSesion(req, ["Medico"]), cuerpo(req));
        if ((metodo === "PUT" || metodo === "PATCH") && id)
          return disponibilidad.actualizarFranja(exigirSesion(req, ["Medico"]), id, cuerpo(req));
        if (metodo === "DELETE" && id)
          return disponibilidad.eliminarFranja(exigirSesion(req, ["Medico"]), id);
        break;

      // ---------- CITAS ----------
      case "citas": {
        const sesion = exigirSesion(req);
        if (metodo === "GET" && !id)
          return citas.listarCitas(sesion, { estado: q(req, "estado"), fecha: q(req, "fecha") });
        if (metodo === "GET" && id && !sub) return citas.obtenerCita(sesion, id);
        if (metodo === "GET" && id && sub === "historial") return historial.historialDeCita(sesion, id);
        if (metodo === "POST" && !id) return citas.crearCita(sesion, cuerpo(req));
        if (metodo === "POST" && id && sub === "notas") return historial.agregarNota(sesion, id, cuerpo(req));
        if (metodo === "PATCH" && id && sub === "cancelar") return citas.cancelarCita(sesion, id, cuerpo(req));
        if (metodo === "PATCH" && id && sub === "reprogramar")
          return citas.reprogramarCita(sesion, id, cuerpo(req));
        if (metodo === "PATCH" && id && sub === "estado") return citas.cambiarEstado(sesion, id, cuerpo(req));
        if (metodo === "DELETE" && id) return citas.eliminarCita(sesion, id);
        break;
      }

      // ---------- NOTIFICACIONES ----------
      case "notificaciones": {
        const sesion = exigirSesion(req);
        if (metodo === "GET") return notificaciones.listarNotificaciones(sesion);
        if (metodo === "PATCH" && id === "todas") return notificaciones.marcarTodasLeidas(sesion);
        if (metodo === "PATCH" && id) return notificaciones.marcarLeida(sesion, id);
        break;
      }

      // ---------- ADMINISTRACIÓN (sólo rol Admin) ----------
      case "admin": {
        const sesion = exigirSesion(req, ["Admin"]);
        if (id === "medicos") {
          if (metodo === "GET") return administracion.listarMedicosAdmin();
          if (metodo === "POST") return administracion.crearMedico(sesion, cuerpo(req));
          if ((metodo === "PUT" || metodo === "PATCH") && sub)
            return administracion.actualizarMedico(sesion, sub, cuerpo(req));
          if (metodo === "DELETE" && sub) return administracion.desactivarMedico(sesion, sub);
        }
        if (id === "pacientes" && metodo === "GET") return administracion.listarPacientes();
        if (id === "sedes" && metodo === "POST") return administracion.crearSede(sesion, cuerpo(req));
        if (id === "especialidades" && metodo === "POST")
          return administracion.crearEspecialidad(sesion, cuerpo(req));
        break;
      }

      // ---------- REPORTES ----------
      case "reportes":
        if (metodo === "GET") {
          exigirSesion(req, ["Admin", "Medico"]);
          return administracion.resumenReportes({
            desde: q(req, "desde"),
            hasta: q(req, "hasta"),
            idSede: q(req, "idSede"),
          });
        }
        break;

      // ---------- AUDITORÍA ----------
      case "auditoria":
        if (metodo === "GET") return historial.listarAuditoria(exigirSesion(req, ["Admin"]));
        break;
    }

    throw new ErrorHttp(404, "Endpoint no encontrado");
  }).catch(() => json(res, 500, { error: "Error interno del servidor" }));
}
