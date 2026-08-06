import { createRequestHandler, RouterContextProvider } from "react-router";
import * as serverBuild from "virtual:react-router/server-build";

import { cacheContext, envContext, waitUntilContext } from "./app/lib/platform";

const handleRequest = createRequestHandler(serverBuild, import.meta.env.MODE);

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const context = new RouterContextProvider();
    context.set(envContext, env);
    context.set(waitUntilContext, executionContext.waitUntil.bind(executionContext));
    context.set(cacheContext, await caches.open("hydrogen"));

    return handleRequest(request, context);
  },
};
