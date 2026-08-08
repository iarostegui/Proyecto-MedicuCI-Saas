// ===== INICIO SOLID - SRP =====
// SERVICIO DE REPORTES: única responsabilidad = agregaciones e indicadores.
// ===== FIN SOLID - SRP =====
// FUTURA CONEXIÓN MYSQL: estas agregaciones pasarán a consultas GROUP BY.
export { contarPorEstado, generarReporte } from "@/logica/reportes";
export type { Conteo, ResumenReportes } from "@/logica/reportes";
