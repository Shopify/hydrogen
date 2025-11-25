import {
  createRequestHandler as createReactRouterRequestHandler,
  type AppLoadContext,
  type RouterContextProvider,
  type ServerBuild,
} from 'react-router';
import {storefrontContext} from './context-keys';
import {
  HYDROGEN_SFAPI_PROXY_KEY,
  HYDROGEN_SERVER_TRACKING_KEY,
} from './constants';
import {appendServerTimingHeader} from './utils/server-timing';
import {
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
} from '@shopify/hydrogen-react';

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

    if (proxyStandardRoutes) {
      if (storefront?.isStorefrontApiUrl(request)) {
        return storefront.forward(request);
      }
    }

    const trackingPromise = tracking
      ? storefront?.fetchTrackingValues?.()
      : undefined;

    const response = await handleRequest(request, context);

    if (tracking) {
      (await trackingPromise)?.setTrackingValues(response);
      appendServerTimingHeader(response, {[HYDROGEN_SERVER_TRACKING_KEY]: '1'});
    } else if (storefront) {
      // Even with backend tracking disabled in this handler,
      // forward any existing tokens to the browser since it might need them.
      const {
        [SHOPIFY_UNIQUE_TOKEN_HEADER]: _y,
        [SHOPIFY_VISIT_TOKEN_HEADER]: _s,
      } = storefront.getHeaders();

      if (_y && _s) {
        appendServerTimingHeader(response, {_y, _s});
      }
    }

    if (proxyStandardRoutes) {
      if (storefront) {
        appendServerTimingHeader(response, {[HYDROGEN_SFAPI_PROXY_KEY]: '1'});
      }
    }

    if (poweredByHeader) {
      response.headers.append('powered-by', 'Shopify, Hydrogen');
    }

    return response;
  };
}
