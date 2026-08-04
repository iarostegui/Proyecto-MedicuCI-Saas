// OWASP A1 — validación centralizada de entradas.
export {
  validarDniSeguro as validar_dni,
  validarCorreoSeguro as validar_correo,
  validarTelefonoSeguro as validar_telefono,
  validarFechaSeguro as validar_fecha,
  validarMotivoSeguro as validar_motivo,
  validarBusqueda as validar_busqueda,
  consultaPreparada as consulta_preparada,
} from "@/seguridad/validacion";

// OWASP A7 — saneamiento de texto libre contra XSS.
export { sanitizarTexto as sanitizar_texto, escaparHtml as escapar_html } from "@/seguridad/sanitizacion";
