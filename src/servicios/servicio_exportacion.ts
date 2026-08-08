// ===== INICIO SOLID - SRP =====
// SERVICIO DE EXPORTACIÓN: única responsabilidad = generar CSV, impresión y
// respaldos. No consulta ni modifica reglas de negocio.
// ===== FIN SOLID - SRP =====
export {
  citasACSV,
  descargarRespaldoJSON,
  exportarCitasCSV,
  exportarPacientesCSV,
  generarRespaldoJSON,
  imprimirCitas,
  restaurarRespaldoJSON,
} from "@/logica/exportar";

// ===== INICIO SOLID - ISP =====
// El comprobante PDF es una interfaz aparte: quien sólo imprime un PDF no
// depende de las funciones de CSV ni de respaldos.
// ===== FIN SOLID - ISP =====
export { descargarComprobantePDF } from "@/logica/comprobante";
