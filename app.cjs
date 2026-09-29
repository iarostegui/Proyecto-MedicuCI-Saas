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

const server = http.createServer(async (req, res) => {
  try {
    const middleware = await cargarMiddleware();
    return middleware(req, res);
  } catch (error) {
    console.error("[medicu-ci request]", error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({
      ok: false,
      error: "Error cargando la aplicacion",
    }));
  }
});

// IMPORTANTE: escuchar inmediatamente para que Passenger complete el handshake
// antes de cargar el bundle Nitro/SSR.
const listenTarget = process.env.PORT || 3000;

server.listen(listenTarget, () => {
  console.log("[medicu-ci] Passenger listo en:", listenTarget);
});
