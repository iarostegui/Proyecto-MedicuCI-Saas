import fs from "node:fs";
import path from "node:path";

function ok(nombre, valor) {
  console.log(`[OK] ${nombre}: ${valor}`);
}
function warn(nombre, valor) {
  console.log(`[WARN] ${nombre}: ${valor}`);
}
function fail(nombre, error) {
  console.log(`[ERROR] ${nombre}: ${error instanceof Error ? error.message : String(error)}`);
}

console.log("=== DIAGNOSTICO MEDICU CI / CPANEL ===");
console.log("Fecha:", new Date().toISOString());
console.log("Node:", process.version);
console.log("PID:", process.pid);
console.log("cwd:", process.cwd());
console.log("execPath:", process.execPath);
console.log("NODE_ENV:", process.env.NODE_ENV ?? "(no definido)");

const raiz = process.cwd();
const rutas = [
  "app.js",
  "package.json",
  ".output",
  ".output/server",
  ".output/server/index.mjs",
  ".output/public",
];

for (const rel of rutas) {
  const abs = path.join(raiz, rel);
  try {
    const s = fs.statSync(abs);
    ok(rel, s.isDirectory() ? "directorio existe" : `archivo existe (${s.size} bytes)`);
  } catch (e) {
    fail(rel, e);
  }
}

console.log("\n--- Variables de entorno (sin secretos) ---");
for (const nombre of ["DB_HOST","DB_PORT","DB_NAME","DB_USER","DB_PASSWORD","DB_SSL","JWT_SECRET"]) {
  const v = process.env[nombre];
  if (v == null || v === "") warn(nombre, "NO DEFINIDA");
  else if (nombre === "DB_PASSWORD" || nombre === "JWT_SECRET") ok(nombre, `definida (${v.length} caracteres)`);
  else ok(nombre, v);
}

console.log("\n--- Dependencias ---");
try {
  const mysql = await import("mysql2/promise");
  ok("mysql2/promise", "carga correctamente");

  console.log("\n--- Conexion MySQL ---");
  const usarSsl = process.env.DB_SSL === "true";
  const pool = mysql.default.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ...(usarSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    waitForConnections: true,
    connectionLimit: 1,
  });
  try {
    const [rows] = await pool.query("SELECT DATABASE() AS db, VERSION() AS version, 1 AS ok");
    ok("MySQL", JSON.stringify(rows?.[0] ?? rows));
  } catch (e) {
    fail("MySQL", e);
  } finally {
    await pool.end();
  }
} catch (e) {
  fail("mysql2/promise", e);
}

console.log("\n--- Lectura entrypoint Nitro (sin ejecutarlo) ---");
try {
  const indexPath = path.join(raiz, ".output/server/index.mjs");
  const contenido = fs.readFileSync(indexPath, "utf8");
  ok("index.mjs", `legible; ${contenido.length} caracteres`);
} catch (e) {
  fail("index.mjs", e);
}

console.log("\n=== FIN DIAGNOSTICO ===");
