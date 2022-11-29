import {
  createRequestHandler as createRemixRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';

type OxygenHandleRequestOptions = {
  env: any;
  context: Omit<ExecutionContext, 'passThroughOnException'> & {
    [key: string]: any;
  };
};

export function createRequestHandler<Context = unknown>({
  build,
  mode,
  getLoadContext,
  shouldProxyAsset,
}: {
  build: ServerBuild;
  mode?: string;
  getLoadContext?: (
    request: Request,
    params: OxygenHandleRequestOptions,
  ) => Promise<Context> | Context;
  /**
   * By default, Hydrogen will prefix all static assets with a CDN url.
   * If you need to serve static assets from the same domain or from the root,
   * then update the `shouldProxyAsset: (url: string) => boolean` function below
   * to return `true` when the url (pathname) matches your asset.
   *
   * @example
   * ```ts
   * shouldProxyAsset(url) {
   *  return new URL(url).pathname === '/robots.txt';
   * }
   * ```
   */
  shouldProxyAsset?: (url: string) => boolean;
}) {
  const handleRequest = createRemixRequestHandler(build, mode);

  return async (
    request: Request,
    // This may be temporary unless we adjust @shopify/oxygen-workers-types
    options: OxygenHandleRequestOptions,
  ) => {
    try {
      if (
        mode === 'production' &&
        build.publicPath !== undefined &&
        shouldProxyAsset?.(request.url)
      ) {
        const url = new URL(request.url);

        /**
         * Use the assetPrefix (publicPath) as the origin. Note that Remix expects client assets to be
         * prefixed with `/build/*`, and as such, `/build/` is included in the Oxygen-created `assetPrefix`.
         * However, we need strip out the leading `/build/` for this use case, as developers may wish to
         * serve a static asset from the root `/public` folder (one level up from `/build`).
         */
        const newOriginAndPathPrefix = (build.publicPath || '').replace(
          /\/build\/$/,
          '',
        );

        return fetch(
          request.url.replace(url.origin, newOriginAndPathPrefix),
          request,
        );
      }

      return await handleRequest(request, {
        env: options.env,
        ...options.context,
        ...(await getLoadContext?.(request, options)),
      } as AppLoadContext);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);

      return new Response('Internal Error', {status: 500});
    }
  };
}

export function getBuyerIp(request: Request) {
  return request.headers.get('oxygen-buyer-ip') ?? undefined;
}
