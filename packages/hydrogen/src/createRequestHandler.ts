import {
  createRequestHandler as createReactRouterRequestHandler,
  type AppLoadContext,
  type unstable_RouterContextProvider as RouterContextProvider,
  type ServerBuild,
} from 'react-router';
import {HYDROGEN_SFAPI_PROXY_KEY} from './constants';
import {appendServerTimingHeader} from './utils/server-timing';
import {warnOnce} from './utils/warning';

type CreateRequestHandlerOptions<Context = unknown> = {
  /** React Router's server build */
  build: ServerBuild;
  /** React Router's mode */
  mode?: string;
  /**
   * Function to provide the load context for each request.
   * It must contain Hydrogen's storefront client instance
   * for other Hydrogen utilities to work properly.
   */
  getLoadContext?: (request: Request) => Promise<Context> | Context;
  /**
   * Whether to include the `powered-by` header in responses
   * @default true
   */
  poweredByHeader?: boolean;
  /**
   * Collect tracking information from subrequests such as cookies
   * and forward them to the browser. Disable this if you are not
   * using Hydrogen's built-in analytics.
   * @default true
   */
  collectTrackingInformation?: boolean;
  /**
   * Whether to proxy standard routes such as `/api/.../graphql.json` (Storefront API).
   * You can disable this if you are handling these routes yourself. Ensure that
   * the proxy works if you rely on Hydrogen's built-in behaviors such as analytics.
   * @default true
   */
  proxyStandardRoutes?: boolean;
};

/**
 * Creates a request handler for Hydrogen apps using React Router.
 */
export function createRequestHandler<Context = unknown>({
  build,
  mode,
  poweredByHeader = true,
  getLoadContext,
  collectTrackingInformation = true,
  proxyStandardRoutes = true,
}: CreateRequestHandlerOptions<Context>) {
  const handleRequest = createReactRouterRequestHandler(build, mode);

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

    const context = (await getLoadContext?.(request)) as
      | undefined
      | (RouterContextProvider & AppLoadContext);

    const storefront = context?.storefront;

    if (proxyStandardRoutes) {
      if (!storefront) {
        // TODO: this should throw error in future major version
        warnOnce(
          '[h2:createRequestHandler] Storefront instance is required to proxy standard routes.',
        );
      }

      if (storefront?.isStorefrontApiUrl(request)) {
        const response = await storefront.forward(request);
        appendPoweredByHeader?.(response);
        return response;
      }
    }

    const response = await handleRequest(request, context);

    if (storefront && proxyStandardRoutes) {
      if (collectTrackingInformation) {
        storefront.setCollectedSubrequestHeaders(response);
      }

      // TODO: assume SFAPI proxy is available in future major version
      // Signal that SFAPI proxy is enabled for document requests.
      // Note: sec-fetch-dest is automatically added by modern browsers,
      // but we also check the Accept header for other clients.
      const fetchDest = request.headers.get('sec-fetch-dest');
      if (
        (fetchDest && fetchDest === 'document') ||
        request.headers.get('accept')?.includes('text/html')
      ) {
        appendServerTimingHeader(response, {[HYDROGEN_SFAPI_PROXY_KEY]: '1'});
      }
    }

    appendPoweredByHeader?.(response);

    return response;
  };
}
