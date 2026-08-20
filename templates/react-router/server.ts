import { createRequestHandler, RouterContextProvider } from "react-router";
import * as serverBuild from "virtual:react-router/server-build";

import { cacheContext, envContext, waitUntilContext } from "~/lib/env";
import { createPublicRequest } from "~/lib/request-sanitization";

const handleRequest = createRequestHandler(serverBuild, import.meta.env.MODE);

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

      const context = new RouterContextProvider();
      context.set(envContext, env);
      context.set(waitUntilContext, executionContext.waitUntil.bind(executionContext));
      context.set(cacheContext, await caches.open("hydrogen"));

      return await handleRequest(createPublicRequest(request), context);
    } catch (error) {
      console.error("[hydrogen-template-react-router] request failed", errorDetails(error));
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};

function errorDetails(error: unknown): { message: string; name: string } {
  return error instanceof Error
    ? { message: error.message, name: error.name }
    : { message: "Unknown error", name: "Error" };
}
