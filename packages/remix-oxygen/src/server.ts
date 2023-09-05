import {
  createRequestHandler as createRemixRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';

const H2_LOGGER_KEY = 'H2_LOG_SUBREQUEST_EVENT';

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
    const context = (await getLoadContext?.(request)) as AppLoadContext;

    if (process.env.NODE_ENV === 'development') {
      const eventLoggerService: {fetch: Function} = (
        context?.env as Record<string, any>
      )?.[H2_LOGGER_KEY];

      if (typeof eventLoggerService?.fetch === 'function') {
        // Store logger in globalThis so it can be accessed from the worker.
        // The global property must be different from the binding name,
        // otherwise Miniflare throws an error when accessing it.
        (globalThis as any)['__' + H2_LOGGER_KEY] = (req: Request) => {
          return eventLoggerService.fetch(req);
        };
      }
    }

    const response = await handleRequest(request, context);

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
