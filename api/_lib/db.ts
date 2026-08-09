// ===== SOLID - SRP =====
// Única responsabilidad: crear y exponer el POOL de conexiones MySQL (Aiven).
// Ningún otro módulo crea conexiones. Las credenciales sólo viven en
// variables de entorno del backend (OWASP A6). El frontend nunca las ve.
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

function configuracion(): mysql.PoolOptions {
  const url = process.env["DATABASE_URL"];
  const ca = process.env["DB_SSL_CA"];
  // Aiven exige TLS. Con DB_SSL_CA se valida el certificado (recomendado);
  // sin él se usa TLS sin verificación estricta de CA.
  const ssl = ca ? { ca } : { rejectUnauthorized: false };

  if (url) {
    return { uri: url, ssl, waitForConnections: true, connectionLimit: 5, maxIdle: 2, idleTimeout: 30000 };
  }
  return {
    host: process.env["DB_HOST"],
    port: Number(process.env["DB_PORT"] ?? 3306),
    database: process.env["DB_NAME"],
    user: process.env["DB_USER"],
    password: process.env["DB_PASSWORD"],
    ssl,
    waitForConnections: true,
    connectionLimit: 5, // serverless: pool pequeño por instancia
    maxIdle: 2,
    idleTimeout: 30000,
    enableKeepAlive: true,
    timezone: "Z",
    dateStrings: true,
  };
}

export function obtenerPool(): mysql.Pool {
  if (!pool) pool = mysql.createPool(configuracion());
  return pool;
}

/** Consulta parametrizada (Prepared Statement) — OWASP A1 SQL Injection. */
export async function consultar<T = Record<string, unknown>>(
  sql: string,
  parametros: unknown[] = [],
): Promise<T[]> {
  const [filas] = await obtenerPool().execute(sql, parametros);
  return filas as T[];
}

export async function ejecutar(
  sql: string,
  parametros: unknown[] = [],
): Promise<mysql.ResultSetHeader> {
  const [resultado] = await obtenerPool().execute(sql, parametros);
  return resultado as mysql.ResultSetHeader;
}

/** Transacción con rollback automático ante error (doble reserva, etc.). */
export async function enTransaccion<T>(
  trabajo: (cx: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const cx = await obtenerPool().getConnection();
  try {
    await cx.beginTransaction();
    const resultado = await trabajo(cx);
    await cx.commit();
    return resultado;
  } catch (error) {
    await cx.rollback();
    throw error;
  } finally {
    cx.release();
  }
}
