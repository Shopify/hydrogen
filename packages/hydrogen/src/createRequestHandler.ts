import {
  createRequestHandler as createReactRouterRequestHandler,
  type AppLoadContext,
  type RouterContextProvider,
  type ServerBuild,
} from 'react-router';
import {storefrontContext} from './context-keys';

/**
 * Creates a request handler for Hydrogen apps using React Router.
 */
export function createRequestHandler<Context = unknown>({
  build,
  mode,
  poweredByHeader = true,
  getLoadContext,
  tracking = true,
}: {
  build: ServerBuild;
  mode?: string;
  poweredByHeader?: boolean;
  getLoadContext?: (request: Request) => Promise<Context> | Context;
  tracking?: boolean;
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

    const context = (await getLoadContext?.(request)) as
      | undefined
      | (RouterContextProvider & AppLoadContext);

    const storefront = context?.storefront || context?.get?.(storefrontContext);
    const trackingPromise = tracking && storefront?.fetchConsent?.();

    const response = await handleRequest(request, context);

    if (trackingPromise) {
      (await trackingPromise)?.setTrackingValues(response);
    }

    if (poweredByHeader) {
      response.headers.append('powered-by', 'Shopify, Hydrogen');
    }

    return response;
  };
}
