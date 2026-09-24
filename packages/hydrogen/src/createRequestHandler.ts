import {
  createRequestHandler as createReactRouterRequestHandler,
  type AppLoadContext,
  type RouterContextProvider,
  type ServerBuild,
} from 'react-router';
import {storefrontContext} from './context-keys';
import {
  HYDROGEN_SFAPI_PROXY_KEY,
  STOREFRONT_CONSENT_MANAGEMENT_HEADER,
} from './constants';
import {appendServerTimingHeader} from './utils/server-timing';

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
};

/**
 * Creates a request handler for Hydrogen apps using React Router.
 * @publicDocs
 */
export function createRequestHandler<Context = unknown>({
  build,
  mode,
  poweredByHeader = true,
  getLoadContext,
  collectTrackingInformation = true,
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

    const storefront = context?.storefront || context?.get?.(storefrontContext);

    if (!storefront) {
      throw new Error(
        '[h2:createRequestHandler] Storefront instance is required in the load context. ' +
          'Make sure to use createHydrogenContext() or provide a storefront instance via getLoadContext.',
      );
    }

    if (storefront.isStorefrontApiUrl(request)) {
      const response = await storefront.forward(request);
      expireLegacyTrackingCookies(request, response);
      appendPoweredByHeader?.(response);
      return response;
    }

    if (storefront.isMcpUrl(request)) {
      const response = await storefront.forwardMcp(request);
      appendPoweredByHeader?.(response);
      return response;
    }

    const response = await handleRequest(request, context);

    if (collectTrackingInformation) {
      storefront.setCollectedSubrequestHeaders(response);
    }

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

    appendPoweredByHeader?.(response);

    return response;
  };
}

const LEGACY_TRACKING_COOKIE_NAMES = ['_shopify_y', '_shopify_s'] as const;

/**
 * The same-origin consent request carries the deprecated cookie values
 * upstream, so the session migrates; this expires those cookies in the same
 * response so the browser stops sending them. Deprecated cookies were set
 * with varying domain scopes, so expiry covers the host-only cookie and every
 * domain suffix of the request hostname. Browsers reject public suffixes
 * (such as co.uk), so no public suffix list is needed here.
 */
function expireLegacyTrackingCookies(
  request: Request,
  response: Response,
): void {
  if (
    !request.headers.has(STOREFRONT_CONSENT_MANAGEMENT_HEADER) ||
    !response.ok
  ) {
    return;
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const legacyNames = LEGACY_TRACKING_COOKIE_NAMES.filter((name) =>
    cookieHeader
      .split(';')
      .some((cookie) => cookie.trim().startsWith(`${name}=`)),
  );

  if (!legacyNames.length) return;

  const hostname = new URL(request.url).hostname;
  const domains = [''];
  if (!hostname.includes(':') && !/^[\d.]+$/.test(hostname)) {
    const labels = hostname.split('.');
    while (labels.length > 1) {
      domains.push(labels.join('.'));
      labels.shift();
    }
  }

  for (const name of legacyNames) {
    for (const domain of domains) {
      response.headers.append(
        'set-cookie',
        `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${
          domain ? `; Domain=${domain}` : ''
        }`,
      );
    }
  }
}

/** @publicDocs */
export type CreateRequestHandlerOptionsForDocs = {
  /** React Router's server build */
  build: ServerBuild;
  /** React Router's mode */
  mode?: string;
  /**
   * Function to provide the load context for each request.
   * It must contain Hydrogen's storefront client instance
   * for other Hydrogen utilities to work properly.
   */
  getLoadContext?: (request: Request) => Promise<unknown> | unknown;
  /**
   * Whether to include the `powered-by` header in responses.
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
};
