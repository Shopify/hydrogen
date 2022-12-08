// Virtual entry point for the app
import * as remixBuild from '@remix-run/dev/server-build';
import {createRequestHandler, getBuyerIp} from '@remix-run/oxygen';
import {
  createStorefrontClient,
  proxyLiquidRoute,
} from '@shopify/hydrogen-remix';
import {HydrogenSession} from '~/lib/session.server';
import {getLocaleFromRequest} from '~/lib/utils';

/**
 * A global `process` object is only available during build to access NODE_ENV.
 */
declare const process: {env: {NODE_ENV: string}};

/**
 * Export a fetch handler in module format.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      /**
       * Proxy to the Online Store if needed.
       */
      const onlineStoreProxy =
        new URL(request.url).pathname === '/proxy' ? '/pages/about' : null;

      if (onlineStoreProxy) {
        return await proxyLiquidRoute(
          request,
          env.SHOPIFY_STORE_DOMAIN,
          onlineStoreProxy,
        );
      }

      /**
       * Open a cache instance in the worker and a custom session instance.
       */
      if (!env?.SESSION_SECRET) {
        throw new Error('SESSION_SECRET environment variable is not set');
      }

      const [cache, session] = await Promise.all([
        caches.open('hydrogen'),
        HydrogenSession.init(request, [env.SESSION_SECRET]),
      ]);

      /**
       * Create a Remix request handler and pass
       * Hydrogen's Storefront client to the loader context.
       */
      const handleRequest = createRequestHandler({
        build: remixBuild,
        mode: process.env.NODE_ENV,
        getLoadContext() {
          const waitUntil = executionContext.waitUntil.bind(executionContext);

          const {storefront} = createStorefrontClient({
            cache,
            waitUntil,
            buyerIp: getBuyerIp(request),
            i18n: getLocaleFromRequest(request),
            publicStorefrontToken: env.SHOPIFY_STOREFRONT_API_PUBLIC_TOKEN,
            storeDomain: env.SHOPIFY_STORE_DOMAIN,
            storefrontApiVersion:
              env.SHOPIFY_STOREFRONT_API_VERSION || '2022-10',
          });

          return {
            cache,
            session,
            waitUntil,
            storefront,
            env,
          };
        },
      });

      return await handleRequest(request);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
