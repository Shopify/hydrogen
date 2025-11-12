import {
  createRequestHandler as createReactRouterRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from 'react-router';

/**
 * Creates a request handler for Hydrogen apps using React Router.
 */
export function createRequestHandler<Context = unknown>({
  build,
  mode,
  poweredByHeader = true,
  getLoadContext,
}: {
  build: ServerBuild;
  mode?: string;
  poweredByHeader?: boolean;
  getLoadContext?: (request: Request) => Promise<Context> | Context;
}) {
  const handleRequest = createReactRouterRequestHandler(build, mode);

  return async (request: Request) => {
    const method = request.method;

    if ((method === 'GET' || method === 'HEAD') && request.body) {
      return new Response(`${method} requests cannot have a body`, {
        status: 400,
      });
    }

    const url = new URL(request.url);

    if (url.pathname.includes('//')) {
      return new Response(null, {
        status: 301,
        headers: {
          location: url.pathname.replace(/\/+/g, '/'),
        },
      });
    }

    const context = getLoadContext
      ? ((await getLoadContext(request)) as AppLoadContext)
      : undefined;

    const response = await handleRequest(request, context);

    if (poweredByHeader) {
      response.headers.append('powered-by', 'Shopify, Hydrogen');
    }

    return response;
  };
}
