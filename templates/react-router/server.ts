import { createRequestHandler, RouterContextProvider } from "react-router";
import * as serverBuild from "virtual:react-router/server-build";

import { envContext, type Env } from "~/lib/env";

/**
 * Worker entry (module `fetch` format) for Oxygen / workerd.
 *
 * On Oxygen the deployment environment is delivered via the `env` binding (not
 * `process.env`). We stash it on the React Router context so the root route
 * middleware can build a request-scoped Storefront client from it. Cart and
 * redirect handling live in that middleware (see app/root.tsx); this entry only
 * wraps React Router's own request handler.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      const context = new RouterContextProvider();
      context.set(envContext, env);

      const handleRequest = createRequestHandler(serverBuild, process.env.NODE_ENV);
      return await handleRequest(request, context);
    } catch (error) {
      console.error(error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};
