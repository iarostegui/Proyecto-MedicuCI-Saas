const http = require("node:http");

let middlewarePromise = null;

function cargarMiddleware() {
  if (!middlewarePromise) {
    middlewarePromise = import("./.output/server/index.mjs").then((mod) => {
      if (typeof mod.middleware !== "function") {
        throw new Error("Nitro no exporta middleware()");
      }
      console.log("[medicu-ci] Nitro middleware cargado");
      return mod.middleware;
    });
  }
  return middlewarePromise;
}

function restaurarRutaOriginal(req) {
  const actual = new URL(req.url || "/", "http://localhost");
  const rutaOriginal = actual.searchParams.get("__route");

  if (!rutaOriginal) return;

  actual.searchParams.delete("__route");
  const query = actual.searchParams.toString();

  req.url = rutaOriginal + (query ? `?${query}` : "");
}

const server = http.createServer(async (req, res) => {
  try {
    restaurarRutaOriginal(req);

    const middleware = await cargarMiddleware();
    await middleware(req, res);
  } catch (error) {
    console.error("[medicu-ci request error]", error);

    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    }

    if (!res.writableEnded) {
      res.end(JSON.stringify({
        ok: false,
        error: "Error interno de la aplicacion",
      }));
    }
  }
});

const listenTarget = process.env.PORT || 3000;

server.listen(listenTarget, () => {
  console.log("[medicu-ci] Passenger listo en:", listenTarget);
});
