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
  const inicio = Date.now();
  console.log("[medicu-ci] request", req.method, req.url);

  res.on("finish", () => {
    console.log(
      "[medicu-ci] response",
      req.method,
      req.url,
      res.statusCode,
      Date.now() - inicio + "ms",
    );
  });

  try {
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
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }
});

const listenTarget = process.env.PORT || 3000;

server.listen(listenTarget, () => {
  console.log("[medicu-ci] Passenger listo en:", listenTarget);
});
