import {
  createRequestHandler as createReactRouterRequestHandler,
  type AppLoadContext,
  type RouterContextProvider,
  type ServerBuild,
} from 'react-router';
import {storefrontContext} from './context-keys';
import {HYDROGEN_SFAPI_PROXY_KEY} from './constants';
import {appendServerTimingHeader} from './utils/server-timing';

/**
 * Creates a request handler for Hydrogen apps using React Router.
 */
export function createRequestHandler<Context = unknown>({
  build,
  mode,
  poweredByHeader = true,
  getLoadContext,
  tracking = true,
  proxyStandardRoutes = true,
}: {
  build: ServerBuild;
  mode?: string;
  poweredByHeader?: boolean;
  getLoadContext?: (request: Request) => Promise<Context> | Context;
  tracking?: boolean;
  proxyStandardRoutes?: boolean;
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

    if (storefront && proxyStandardRoutes) {
      if (storefront.isStorefrontApiUrl(request)) {
        return storefront.forward(request);
      }
    }

    const response = await handleRequest(request, context);

    if (storefront && proxyStandardRoutes) {
      if (tracking) {
        storefront.setCollectedSubrequestHeaders(response);
      }

      // TODO: assume SFAPI proxy is available in future major version
      // Signal that SFAPI proxy is enabled for document requests
      const fetchDest = request.headers.get('sec-fetch-dest');
      if (
        (fetchDest && fetchDest === 'document') ||
        request.headers.get('accept') === 'text/html'
      ) {
        appendServerTimingHeader(response, {[HYDROGEN_SFAPI_PROXY_KEY]: '1'});
      }
    }

    if (poweredByHeader) {
      response.headers.append('powered-by', 'Shopify, Hydrogen');
    }

    return response;
  };
}
