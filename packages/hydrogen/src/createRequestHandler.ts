import {
  createRequestHandler as createRemixRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';
import {HYDROGEN_SFAPI_PROXY_KEY} from './constants';

type CreateRequestHandlerOptions<Context = unknown> = {
  build: ServerBuild;
  mode?: string;
  /**
   * Whether to include the `powered-by` header in responses
   * @default true
   */
  poweredByHeader?: boolean;
  /**
   * Function to provide the load context for each request.
   * It must contain Hydrogen's storefront client instance
   * for other Hydrogen utilities to work properly.
   */
  getLoadContext?: (request: Request) => Promise<Context> | Context;
  /**
   * Whether to proxy standard routes such as `/api/.../graphql.json` (Storefront API).
   * You can disable this if you are handling these routes yourself. Ensure that
   * the proxy works if you rely on Hydrogen's built-in behaviors such as analytics.
   * @default true
   */
  proxyStorefrontApiRequests?: boolean;
};

/**
 * Creates a request handler for Hydrogen apps using Remix.
 */
export function createRequestHandler<Context = unknown>({
  build,
  mode,
  poweredByHeader = true,
  getLoadContext,
  proxyStorefrontApiRequests = true,
}: CreateRequestHandlerOptions<Context>) {
  const handleRequest = createRemixRequestHandler(build, mode);

  const appendPoweredByHeader = poweredByHeader
    ? (response: Response) =>
        response.headers.append('powered-by', 'Shopify, Hydrogen')
    : undefined;

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

    // Access storefront from context if available
    const storefront = (
      context as {storefront?: StorefrontForProxy} | undefined
    )?.storefront;

    // Proxy Storefront API requests
    if (proxyStorefrontApiRequests && storefront?.isStorefrontApiUrl(request)) {
      const response = await storefront.forward(request);
      appendPoweredByHeader?.(response);
      return response;
    }

    const response = await handleRequest(request, context);

    appendPoweredByHeader?.(response);

    // Collect tracking headers from storefront subrequests
    if (proxyStorefrontApiRequests && storefront) {
      storefront.setCollectedSubrequestHeaders(response);

      // Signal that SFAPI proxy is enabled for document requests.
      // Note: sec-fetch-dest is automatically added by modern browsers,
      // but we also check the Accept header for other clients.
      const fetchDest = request.headers.get('sec-fetch-dest');
      if (
        (fetchDest && fetchDest === 'document') ||
        request.headers.get('accept')?.includes('text/html')
      ) {
        response.headers.append(
          'Server-Timing',
          `${HYDROGEN_SFAPI_PROXY_KEY};desc=1`,
        );
      }
    }

    return response;
  };
}

/**
 * Minimal storefront interface needed for proxy functionality.
 * The full Storefront type is defined in ./storefront.ts.
 */
type StorefrontForProxy = {
  isStorefrontApiUrl: (request: {url?: string}) => boolean;
  forward: (request: Request) => Promise<Response>;
  setCollectedSubrequestHeaders: (response: {headers: Headers}) => void;
};
