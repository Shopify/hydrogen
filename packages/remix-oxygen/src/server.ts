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
  const handleRequest = createRemixRequestHandler(build, mode);

  return async (request: Request) => {
    const context = getLoadContext
      ? ((await getLoadContext(request)) as AppLoadContext)
      : undefined;

    if (process.env.NODE_ENV === 'development' && context) {
      // Store logger in globalThis so it can be accessed from the worker.
      // The global property must be different from the binding name,
      // otherwise Miniflare throws an error when accessing it.
      globalThis.__H2O_LOG_EVENT ??= createEventLogger(context);
    }

    const startTime = Date.now();

    const response = await handleRequest(request, context);

    if (poweredByHeader) {
      response.headers.append('powered-by', 'Shopify, Hydrogen');
    }

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
  cookie: string | null;
  purpose: string | null;
};

/**
 * @deprecated moved to @shopify/hydrogen
 */
export function getStorefrontHeaders(request: Request): StorefrontHeaders {
  const headers = request.headers;
  return {
    requestGroupId: headers.get('request-id'),
    buyerIp: headers.get('oxygen-buyer-ip'),
    cookie: headers.get('cookie'),
    purpose: headers.get('purpose'),
  };
}
