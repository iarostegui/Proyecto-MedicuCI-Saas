// ===== INICIO OWASP A2 =====
// A2 — Autenticación mediante JWT (HS256) firmado con la clave de entorno.
// El token guarda el sujeto (correo), el rol y la expiración (`exp`).
// Cualquier ruta protegida valida el token ANTES de renderizar; si expiró,
// la sesión se cierra automáticamente.
//
// Implementación HMAC-SHA256 sin dependencias externas para poder validar
// el token de forma síncrona en el cliente. Cuando exista backend MySQL,
// la firma y verificación se moverán al servidor sin cambiar esta interfaz
// (Liskov / Dependency Inversion).
//
// ===== INICIO SOLID - SRP =====
// Responsabilidad única: emitir y verificar tokens.
// ===== FIN SOLID - SRP =====
import { CONFIG } from "@/seguridad/configuracion";

export interface CargaJwt {
  sub: string; // correo del usuario
  rol: string;
  nombre: string;
  iat: number; // emisión (epoch seg)
  exp: number; // expiración (epoch seg)
}

// ---------- SHA-256 / HMAC (implementación mínima y determinista) ----------
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256Bytes(mensaje: Uint8Array): Uint8Array {
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const largoBits = mensaje.length * 8;
  const conRelleno = new Uint8Array(((mensaje.length + 9 + 63) >> 6) << 6);
  conRelleno.set(mensaje);
  conRelleno[mensaje.length] = 0x80;
  const dv = new DataView(conRelleno.buffer);
  dv.setUint32(conRelleno.length - 4, largoBits >>> 0, false);
  dv.setUint32(conRelleno.length - 8, Math.floor(largoBits / 2 ** 32), false);

  const w = new Uint32Array(64);
  for (let i = 0; i < conRelleno.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  const salida = new Uint8Array(32);
  const salidaDv = new DataView(salida.buffer);
  h.forEach((valor, i) => salidaDv.setUint32(i * 4, valor, false));
  return salida;
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function hmacSha256(clave: string, mensaje: string): Uint8Array {
  const enc = new TextEncoder();
  let claveBytes: Uint8Array<ArrayBufferLike> = enc.encode(clave);
  if (claveBytes.length > 64) claveBytes = sha256Bytes(claveBytes);
  const bloque = new Uint8Array(64);
  bloque.set(claveBytes);
  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = bloque[i] ^ 0x36;
    opad[i] = bloque[i] ^ 0x5c;
  }
  const msg = enc.encode(mensaje);
  const interno = new Uint8Array(64 + msg.length);
  interno.set(ipad);
  interno.set(msg, 64);
  const hashInterno = sha256Bytes(interno);
  const externo = new Uint8Array(64 + 32);
  externo.set(opad);
  externo.set(hashInterno, 64);
  return sha256Bytes(externo);
}

function base64Url(datos: string | Uint8Array): string {
  const bytes = typeof datos === "string" ? new TextEncoder().encode(datos) : datos;
  let binario = "";
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  const b64 = typeof btoa === "function" ? btoa(binario) : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function desdeBase64Url(valor: string): string {
  const b64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const relleno = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return typeof atob === "function"
    ? decodeURIComponent(escape(atob(relleno)))
    : Buffer.from(relleno, "base64").toString("utf8");
}

/** Emite un JWT HS256 con expiración configurable. */
export function emitirToken(datos: Omit<CargaJwt, "iat" | "exp">): string {
  const ahora = Math.floor(Date.now() / 1000);
  const carga: CargaJwt = {
    ...datos,
    iat: ahora,
    exp: ahora + CONFIG.minutosExpiracionToken * 60,
  };
  const cabecera = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const cuerpo = base64Url(JSON.stringify(carga));
  const firma = base64Url(hmacSha256(CONFIG.claveJwt, `${cabecera}.${cuerpo}`));
  return `${cabecera}.${cuerpo}.${firma}`;
}

/** Verifica firma y expiración. Devuelve null si el token no es válido. */
export function verificarToken(token: string | null | undefined): CargaJwt | null {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [cabecera, cuerpo, firma] = partes;
  const esperada = base64Url(hmacSha256(CONFIG.claveJwt, `${cabecera}.${cuerpo}`));
  if (esperada !== firma) return null;
  try {
    const carga = JSON.parse(desdeBase64Url(cuerpo)) as CargaJwt;
    if (typeof carga.exp !== "number" || carga.exp * 1000 <= Date.now()) return null;
    return carga;
  } catch {
    return null;
  }
}

/** Segundos restantes de vigencia (0 si ya expiró). */
export function segundosRestantes(token: string | null | undefined): number {
  const carga = verificarToken(token);
  if (!carga) return 0;
  return Math.max(0, carga.exp - Math.floor(Date.now() / 1000));
}
// ===== FIN OWASP A2 =====
