/// <reference types="@shopify/hydrogen" />
import {
  createRequestHandler as createRemixRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';
import {createEventLogger} from './event-logger';

const originalErrorToString = Error.prototype.toString;
Error.prototype.toString = function () {
  return this.stack || originalErrorToString.call(this);
};

/** Server-Timing header key to signal that the SFAPI proxy is enabled */
const HYDROGEN_SFAPI_PROXY_KEY = '_sfapi_proxy';

let hasWarnedAboutStorefront = false;

function warnOnce(message: string) {
  if (!hasWarnedAboutStorefront) {
    hasWarnedAboutStorefront = true;
    console.warn(message);
  }
}

function buildServerTimingHeader(values: Record<string, string | undefined>) {
  return Object.entries(values)
    .map(([key, value]) => (value ? `${key};desc=${value}` : undefined))
    .filter(Boolean)
    .join(', ');
}

function appendServerTimingHeader(
  response: {headers: Headers},
  values: string | Record<string, string | undefined>,
) {
  const header =
    typeof values === 'string' ? values : buildServerTimingHeader(values);

  if (header) {
    response.headers.append('Server-Timing', header);
  }
}

type CreateRequestHandlerOptions<Context = unknown> = {
  /** Remix's server build */
  build: ServerBuild;
  /** Remix's mode */
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

export function createRequestHandler<Context = unknown>({
  build,
  mode,
  poweredByHeader = true,
  getLoadContext,
  collectTrackingInformation = true,
  proxyStandardRoutes = true,
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

    if (proxyStandardRoutes) {
      if (!storefront) {
        // TODO: this should throw error in future major version
        warnOnce(
          '[h2:createRequestHandler] Storefront instance is required to proxy standard routes.',
        );
      }

      // Proxy Storefront API requests
      if (storefront?.isStorefrontApiUrl(request)) {
        const response = await storefront.forward(request);
        appendPoweredByHeader?.(response);
        return response;
      }
    }

    if (process.env.NODE_ENV === 'development' && context) {
      // Store logger in globalThis so it can be accessed from the worker.
      // The global property must be different from the binding name,
      // otherwise Miniflare throws an error when accessing it.
      globalThis.__H2O_LOG_EVENT ??= createEventLogger(context);
    }

    const startTime = Date.now();

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

    if (process.env.NODE_ENV === 'development') {
      globalThis.__H2O_LOG_EVENT?.({
        eventType: 'request',
        url: request.url,
        requestId: request.headers.get('request-id'),
        purpose: request.headers.get('purpose'),
        startTime,
        responseInit: {
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
        } satisfies ResponseInit,
      });
    }

    return response;
  };
}

type StorefrontHeaders = {
  requestGroupId: string | null;
  buyerIp: string | null;
  buyerIpSig: string | null;
  cookie: string | null;
  purpose: string | null;
};

export function getStorefrontHeaders(request: Request): StorefrontHeaders {
  const headers = request.headers;
  return {
    requestGroupId: headers.get('request-id'),
    buyerIp: headers.get('oxygen-buyer-ip'),
    buyerIpSig: headers.get('X-Shopify-Client-IP-Sig'),
    cookie: headers.get('cookie'),
    // sec-purpose is added by browsers automatically when using link/prefetch or Speculation Rules
    purpose: headers.get('sec-purpose') || headers.get('purpose'),
  };
}

/**
 * Minimal storefront interface needed for proxy functionality.
 * The full Storefront type is defined in @shopify/hydrogen.
 */
type StorefrontForProxy = {
  isStorefrontApiUrl: (request: {url?: string}) => boolean;
  forward: (request: Request) => Promise<Response>;
  setCollectedSubrequestHeaders: (response: {headers: Headers}) => void;
};
