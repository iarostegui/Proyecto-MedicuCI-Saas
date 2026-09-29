import { createServer } from "node:http";
import { middleware } from "./.output/server/index.mjs";

const listenTarget = process.env.PORT || 3000;

const server = createServer(middleware);

server.listen(listenTarget, () => {
  console.log(`Medicu CI listening on: ${listenTarget}`);
});
