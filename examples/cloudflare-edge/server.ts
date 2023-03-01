import * as build from '@remix-run/dev/server-build';
import {createCookieSessionStorage, ServerBuild} from '@remix-run/cloudflare';
import type {GetLoadContextFunction} from '@remix-run/cloudflare-workers';
import {
  createRequestHandler as createRemixRequestHandler,
  Session,
  SessionStorage,
} from '@remix-run/server-runtime';
import type {Options as KvAssetHandlerOptions} from '@cloudflare/kv-asset-handler';
import {
  MethodNotAllowedError,
  NotFoundError,
  getAssetFromKV,
} from '@cloudflare/kv-asset-handler';
import {createStorefrontClient} from '@shopify/hydrogen';
import {getBuyerIp} from '@shopify/remix-oxygen';

type RequestHandler = (event: FetchEvent) => Promise<Response>;

addEventListener(
  'fetch',
  createEventHandler({build, mode: process.env.NODE_ENV}),
);

function createEventHandler({
  build,
  getLoadContext,
  mode,
}: {
  build: ServerBuild;
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}) {
  let handleEvent = async (event: FetchEvent) => {
    /**
     * Open a cache instance in the worker and a custom session instance.
     */
    if (!SESSION_SECRET) {
      throw new Error('SESSION_SECRET environment variable is not set');
    }

    const waitUntil = (p: Promise<any>) => event.waitUntil(p);
    const env = {
      PUBLIC_STOREFRONT_API_TOKEN,
      PRIVATE_STOREFRONT_API_TOKEN:
        typeof PRIVATE_STOREFRONT_API_TOKEN !== 'undefined'
          ? PRIVATE_STOREFRONT_API_TOKEN
          : undefined,
      PUBLIC_STORE_DOMAIN,
      PUBLIC_STOREFRONT_API_VERSION,
      PUBLIC_STOREFRONT_ID:
        typeof PUBLIC_STOREFRONT_ID !== 'undefined'
          ? PUBLIC_STOREFRONT_ID
          : undefined,
      SESSION_SECRET,
    };

    const [cache, session] = await Promise.all([
      caches.open('hydrogen'),
      HydrogenSession.init(event.request, [SESSION_SECRET]),
    ]);

    /**
     * Create Hydrogen's Storefront client.
     */
    const {storefront} = createStorefrontClient({
      // cache
      waitUntil,
      buyerIp: getBuyerIp(event.request),
      i18n: {language: 'EN', country: 'US'},
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
      storeDomain: `https://${env.PUBLIC_STORE_DOMAIN}`,
      storefrontApiVersion: env.PUBLIC_STOREFRONT_API_VERSION || '2023-01',
      storefrontId: env.PUBLIC_STOREFRONT_ID,
      requestGroupId: event.request.headers.get('request-id'),
    });

    let handleRequest = createRequestHandler({
      build,
      getLoadContext: () => ({session, cache, storefront}),
      mode,
    });

    let response = await handleAsset(event, build);

    if (!response) {
      response = await handleRequest(event);
    }

    return response;
  };

  return (event: FetchEvent) => {
    try {
      event.respondWith(handleEvent(event));
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') {
        event.respondWith(
          new Response(e.message || e.toString(), {
            status: 500,
          }),
        );
        return;
      }

      event.respondWith(new Response('Internal Error', {status: 500}));
    }
  };
}

function createRequestHandler({
  build,
  getLoadContext,
  mode,
}: {
  build: ServerBuild;
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}): RequestHandler {
  let handleRequest = createRemixRequestHandler(build, mode);

  return (event: FetchEvent) => {
    let loadContext = getLoadContext?.(event);

    return handleRequest(event.request, loadContext);
  };
}

async function handleAsset(
  event: FetchEvent,
  build: ServerBuild,
  options?: Partial<KvAssetHandlerOptions>,
) {
  try {
    if (process.env.NODE_ENV === 'development') {
      return await getAssetFromKV(event, {
        cacheControl: {
          bypassCache: true,
        },
        ...options,
      });
    }

    let cacheControl = {};
    let url = new URL(event.request.url);
    let assetpath = build.assets.url.split('/').slice(0, -1).join('/');
    let requestpath = url.pathname.split('/').slice(0, -1).join('/');

    if (requestpath.startsWith(assetpath)) {
      // Assets are hashed by Remix so are safe to cache in the browser
      // And they're also hashed in KV storage, so are safe to cache on the edge
      cacheControl = {
        bypassCache: false,
        edgeTTL: 31536000,
        browserTTL: 31536000,
      };
    } else {
      // Assets are not necessarily hashed in the request URL, so we cannot cache in the browser
      // But they are hashed in KV storage, so we can cache on the edge
      cacheControl = {
        bypassCache: false,
        edgeTTL: 31536000,
      };
    }

    return await getAssetFromKV(event, {
      cacheControl,
      ...options,
    });
  } catch (error: unknown) {
    if (
      error instanceof MethodNotAllowedError ||
      error instanceof NotFoundError
    ) {
      return null;
    }

    throw error;
  }
}

/**
 * This is a custom session implementation for your Hydrogen shop.
 * Feel free to customize it to your needs, add helper methods, or
 * swap out the cookie-based implementation with something else!
 */
class HydrogenSession {
  constructor(
    private sessionStorage: SessionStorage,
    private session: Session,
  ) {}

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
      },
    });

    const session = await storage.getSession(request.headers.get('Cookie'));

    return new this(storage, session);
  }

  get(key: string) {
    return this.session.get(key);
  }

  destroy() {
    return this.sessionStorage.destroySession(this.session);
  }

  flash(key: string, value: any) {
    this.session.flash(key, value);
  }

  unset(key: string) {
    this.session.unset(key);
  }

  set(key: string, value: any) {
    this.session.set(key, value);
  }

  commit() {
    return this.sessionStorage.commitSession(this.session);
  }
}
