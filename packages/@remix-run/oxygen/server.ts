import {
  createRequestHandler as createRemixRequestHandler,
  type AppLoadContext,
  type ServerBuild,
} from '@remix-run/server-runtime';
import {
  getAssetFromKV,
  NotFoundError,
  MethodNotAllowedError,
  type CacheControl,
} from '@cloudflare/kv-asset-handler';

function cacheControl(request: Request): Partial<CacheControl> {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/build')) {
    // Cache build files for 1 year since they have a hash in their URL
    return {
      browserTTL: 60 * 60 * 24 * 365,
      edgeTTL: 60 * 60 * 24 * 365,
    };
  }

  // Cache everything else for 10 minutes
  return {
    browserTTL: 60 * 10,
    edgeTTL: 60 * 10,
  };
}

async function getAsset(
  request: Request,
  ctx: ExecutionContext,
  staticContent: any,
  assetManifest: any,
) {
  try {
    return await getAssetFromKV(
      {
        request,
        waitUntil(promise) {
          return ctx.waitUntil(promise);
        },
      },
      {
        cacheControl,
        ASSET_NAMESPACE: staticContent,
        ASSET_MANIFEST: assetManifest,
      },
    );
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof MethodNotAllowedError) {
      // fall through to the remix handler
    } else {
      return new Response('An unexpected error occurred', {status: 500});
    }
  }
}

export function createRequestHandler<Context = unknown>({
  build,
  mode,
  getLoadContext,
  assetManifest,
}: {
  build: ServerBuild;
  mode?: string;
  getLoadContext?: (request: Request) => Promise<Context> | Context;
  assetManifest?: any;
}) {
  const handleRequest = createRemixRequestHandler(build, mode);

  return async (
    request: Request,
    {ctx, env}: {ctx: ExecutionContext; env: any},
  ) => {
    try {
      if (assetManifest) {
        const asset = await getAsset(
          request,
          ctx,
          env.__STATIC_CONTENT,
          assetManifest,
        );

        if (asset) return asset;
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
