import { createRequestHandler, RouterContextProvider } from "react-router";
import * as serverBuild from "virtual:react-router/server-build";

import { envContext } from "~/lib/env";

/**
 * Export a fetch handler in module format for Oxygen / mini-oxygen.
 */
export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
    try {
      const method = request.method;
      if ((method === "GET" || method === "HEAD") && request.body) {
        return new Response(`${method} requests cannot have a body`, { status: 400 });
      }

      const url = new URL(request.url);
      if (url.pathname.includes("//")) {
        return new Response(null, {
          status: 301,
          headers: { location: url.pathname.replace(/[/]+/g, "/") },
        });
      }

      const routerContext = new RouterContextProvider();
      routerContext.cache = await caches.open("hydrogen-v1");
      routerContext.set(envContext, env);
      routerContext.env = env;
      routerContext.waitUntil = executionContext.waitUntil.bind(executionContext);

      const handleRequest = createRequestHandler(serverBuild, process.env.NODE_ENV);
      return handleRequest(request, routerContext as never);
    } catch (error) {
      console.error(error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};
