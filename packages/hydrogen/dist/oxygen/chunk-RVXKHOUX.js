// src/oxygen/createRequestHandler.ts
import {
  createRequestHandler as createReactRouterRequestHandler
} from "react-router";
function createRequestHandler({
  build,
  mode,
  poweredByHeader = true,
  getLoadContext
}) {
  const handleRequest = createReactRouterRequestHandler(build, mode);
  return async (request) => {
    const method = request.method;
    if ((method === "GET" || method === "HEAD") && request.body) {
      return new Response(`${method} requests cannot have a body`, {
        status: 400
      });
    }
    const url = new URL(request.url);
    if (url.pathname.includes("//")) {
      return new Response(null, {
        status: 301,
        headers: {
          location: url.pathname.replace(/\/+/g, "/")
        }
      });
    }
    const context = getLoadContext ? await getLoadContext(request) : void 0;
    const response = await handleRequest(request, context);
    if (poweredByHeader) {
      response.headers.append("powered-by", "Shopify, Hydrogen");
    }
    return response;
  };
}

export {
  createRequestHandler
};
