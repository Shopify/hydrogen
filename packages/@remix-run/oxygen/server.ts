import {
  createRequestHandler as createRemixRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';

export function createRequestHandler<Context = unknown>({
  build,
  mode,
  getLoadContext,
  shouldProxyAsset,
}: {
  build: ServerBuild;
  mode?: string;
  getLoadContext?: (request: Request) => Promise<Context> | Context;
  shouldProxyAsset?: (url: string) => boolean;
}) {
  const handleRequest = createRemixRequestHandler(build, mode);

  return async (
    request: Request,
    // This may be temporary unless we adjust @shopify/oxygen-workers-types
    {
      ctx,
      env,
    }: {ctx: Omit<ExecutionContext, 'passThroughOnException'>; env: any},
  ) => {
    try {
      if (
        mode === 'production' &&
        build.publicPath !== undefined &&
        shouldProxyAsset?.(request.url)
      ) {
        const url = new URL(request.url);
        const assetBasePath = (build.publicPath || '').replace(/\/$/, '');
        return fetch(request.url.replace(url.origin, assetBasePath), request);
      }

      const loadContext = await getLoadContext?.(request);

      return await handleRequest(request, {
        env,
        ...ctx,
        ...loadContext,
      } as AppLoadContext);
    } catch (e) {
      console.error(e);

      return new Response('Internal Error', {status: 500});
    }
  };
}
