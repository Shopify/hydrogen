import {
  ActionArgs,
  createRequestHandler as createRemixRequestHandler,
  LoaderArgs,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';
import {isDeferredData} from '@remix-run/server-runtime/dist/responses';

type Logger = {error: (...data: any[]) => any};

export function createRequestHandler<Context = unknown>({
  build,
  mode,
  poweredByHeader = true,
  getLoadContext,
  log,
}: {
  build: ServerBuild;
  mode?: string;
  poweredByHeader?: boolean;
  getLoadContext?: (request: Request) => Promise<Context> | Context;
  log?: Logger;
}) {
  const routes: typeof build.routes = {};

  for (const [id, route] of Object.entries(build.routes)) {
    const wrappedRoute = {...route, module: {...route.module}};

    fill(wrappedRoute.module, 'action', log);
    fill(wrappedRoute.module, 'loader', log);

    routes[id] = wrappedRoute;
  }

  const handleRequest = createRemixRequestHandler({...build, routes}, mode);

  return async (request: Request) => {
    const response = await handleRequest(
      request,
      (await getLoadContext?.(request)) as AppLoadContext,
    );

    if (poweredByHeader) {
      response.headers.append('powered-by', 'Hydrogen');
    }

    return response;
  };
}

type RemixModule = ServerBuild['routes'][0]['module'];

function fill(module: RemixModule, name: 'loader' | 'action', log?: Logger) {
  const original = module[name];

  if (!original) return;

  module[name] = async (args: LoaderArgs | ActionArgs) => {
    try {
      const result = await original(args);

      if (isDeferredData(result)) {
        for (const key of result.deferredKeys) {
          const promise = result.data[key] as Promise<any>;
          // Add logs around rejected deferred data,
          // which is normally swallowed by Remix.
          promise.catch((e) => {
            (log || console).error(e);
          });
        }
      }

      return result;
    } catch (e) {
      (log || console).error(e);
      throw e;
    }
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
