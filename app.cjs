const http = require("node:http");

(async () => {
  try {
    const { middleware } = await import("./.output/server/index.mjs");

    const server = http.createServer(middleware);

    // Passenger/CloudLinux intercepta server.listen() en el runtime Node.
    // Se mantiene el mismo patrón que la prueba passenger-test.cjs que ya
    // funcionó correctamente en este hosting.
    server.listen(process.env.PORT || 3000, () => {
      console.log(
        "Medicu CI Passenger CJS listening:",
        process.env.PORT || 3000,
      );
    });
  } catch (error) {
    console.error("[medicu-ci startup]", error);
    process.exitCode = 1;
  }
})();
