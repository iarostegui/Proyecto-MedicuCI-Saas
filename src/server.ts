import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import apiHandler from "../api/index";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function atenderApi(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const query: Record<string, string | string[]> = {};

  for (const [clave, valor] of url.searchParams.entries()) {
    const actual = query[clave];

    if (actual === undefined) {
      query[clave] = valor;
    } else if (Array.isArray(actual)) {
      actual.push(valor);
    } else {
      query[clave] = [actual, valor];
    }
  }

  let body: unknown = undefined;

  if (!["GET", "HEAD"].includes(request.method)) {
    const texto = await request.text();

    if (texto) {
      try {
        body = JSON.parse(texto);
      } catch {
        body = texto;
      }
    }
  }

  const headers: Record<string, string> = {};

  request.headers.forEach((valor, clave) => {
    headers[clave.toLowerCase()] = valor;
  });

  const req = {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    query,
    body,
    headers,
  } as any;

  return await new Promise<Response>(async (resolve) => {
    let codigo = 200;

    const res: any = {
      status(statusCode: number) {
        codigo = statusCode;
        return res;
      },

      json(cuerpo: unknown) {
        resolve(
          new Response(JSON.stringify(cuerpo), {
            status: codigo,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            },
          }),
        );

        return res;
      },
    };

    try {
      await apiHandler(req, res);
    } catch (error) {
      console.error("[api-cpanel]", error);

      resolve(
        new Response(
          JSON.stringify({
            error: "Error interno del servidor",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
            },
          },
        ),
      );
    }
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();

  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(
    consumeLastCapturedError() ??
      new Error(`h3 swallowed SSR error: ${body}`),
  );

  return new Response(renderErrorPage(), {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      if (url.pathname.startsWith("/api/")) {
        return await atenderApi(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);

      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);

      return new Response(renderErrorPage(), {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    }
  },
};