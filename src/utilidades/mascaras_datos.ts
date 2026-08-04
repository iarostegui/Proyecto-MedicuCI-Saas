// OWASP A3 — los datos sensibles se muestran siempre enmascarados.
export {
  enmascararDni as mascara_dni,
  enmascararCorreo as mascara_correo,
  enmascararTelefono as mascara_telefono,
  enmascararFechaEmision as mascara_fecha_emision,
} from "@/seguridad/enmascarado";
