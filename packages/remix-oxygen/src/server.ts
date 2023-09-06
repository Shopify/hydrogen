import {
  createRequestHandler as createRemixRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';

declare global {
  var __H2_LOG_REQUEST_EVENT: undefined | ((req: Request) => Promise<any>);
}

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
    const context = (await getLoadContext?.(request)) as AppLoadContext & {
      env?: Record<string, any>;
      waitUntil?: (promise: Promise<any>) => void;
    };

    if (process.env.NODE_ENV === 'development') {
      const eventLoggerService: undefined | {fetch: Function} =
        context?.env?.H2_LOG_REQUEST_EVENT;

      if (typeof eventLoggerService?.fetch === 'function') {
        // Store logger in globalThis so it can be accessed from the worker.
        // The global property must be different from the binding name,
        // otherwise Miniflare throws an error when accessing it.
        globalThis.__H2_LOG_REQUEST_EVENT = (req: Request) => {
          return eventLoggerService.fetch(req);
        };
      }
    }

    const startTime = Date.now();

    const response = await handleRequest(request, context);

    if (process.env.NODE_ENV === 'development') {
      const promise = globalThis.__H2_LOG_REQUEST_EVENT?.(
        new Request(request.url, {
          headers: {
            ...Object.fromEntries(request.headers.entries()),
            'hydrogen-event-type': 'request',
            'hydrogen-start-time': String(startTime),
            'hydrogen-end-time': String(Date.now()),
          },
        }),
      );

      promise && context?.waitUntil?.(promise);
    }

    if (poweredByHeader) {
      response.headers.append('powered-by', 'Shopify, Hydrogen');
    }

    return response;
  };
}

export function getBuyerIp(request: Request) {
  return request.headers.get('oxygen-buyer-ip') ?? undefined;
}

type StorefrontHeaders = {
  requestGroupId: string | null;
  buyerIp: string | null;
  cookie: string | null;
};

export function getStorefrontHeaders(request: Request): StorefrontHeaders {
  const headers = request.headers;
  return {
    requestGroupId: headers.get('request-id'),
    buyerIp: headers.get('oxygen-buyer-ip'),
    cookie: headers.get('cookie'),
  };
}
