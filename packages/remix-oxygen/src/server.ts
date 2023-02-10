import {
  createRequestHandler as createRemixRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';
import {
  UNSAFE_createMiddlewareStore as createMiddlewareStore,
  UNSAFE_getRouteAwareMiddlewareContext as getRouteAwareMiddlewareContext,
} from '@remix-run/router';
import type {MiddlewareContext} from '@remix-run/router';

export type AdapterMiddlewareFunction = ({
  request,
  context,
}: {
  request: Request;
  context: MiddlewareContext;
}) => Promise<Response>;

export function createRequestHandler<Context = unknown>({
  build,
  mode,
  getLoadContext,
  adapterMiddleware,
}: {
  build: ServerBuild;
  mode?: string;
  getLoadContext?: (request: Request) => Promise<Context> | Context;
  adapterMiddleware?: AdapterMiddlewareFunction;
}) {
  const handleRequest = createRemixRequestHandler(build, mode);

  if (build.future.unstable_middleware) {
    return async (request: Request) => {
      if (adapterMiddleware) {
        let context = createMiddlewareStore();
        let remixCalled = false;
        let callRemix = async () => {
          remixCalled = true;
          return await handleRequest(request, undefined, context);
        };

        let routeAwareContext = getRouteAwareMiddlewareContext(
          context,
          -1,
          callRemix,
        );

        let response = await adapterMiddleware({
          request,
          context: routeAwareContext,
        });

        if (!remixCalled) {
          // User never called next(), so doesn't need to do any post-processing
          response = await callRemix();
        }

        return response;
      } else {
        return await handleRequest(request);
      }
    };
  }

  return async (request: Request) => {
    return handleRequest(
      request,
      (await getLoadContext?.(request)) as AppLoadContext,
    );
  };
}

export function getBuyerIp(request: Request) {
  return request.headers.get('oxygen-buyer-ip') ?? undefined;
}
