// Virtual entry point for the app
import * as remixBuild from '@remix-run/dev/server-build';
import {createRequestHandler, getBuyerIp} from '@remix-run/oxygen';
import {
  type AppLoadContext,
  createStorefrontClient,
  proxyLiquidRoute,
} from '@shopify/hydrogen-remix';
import {getLocaleFromRequest} from '~/lib/utils';
import {HydrogenSession} from '~/lib/session.server';

declare const process: {env: {NODE_ENV: string}};

export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      const onlineStoreProxy =
        new URL(request.url).pathname === '/proxy' ? '/pages/about' : null;

      if (onlineStoreProxy) {
        return await proxyLiquidRoute(
          request,
          env.SHOPIFY_STORE_DOMAIN,
          onlineStoreProxy,
        );
      }

      if (!env?.SESSION_SECRET) {
        throw new Error('SESSION_SECRET environment variable is not set');
      }

      const waitUntil = executionContext.waitUntil.bind(executionContext);
      const [cache, session] = await Promise.all([
        caches.open('hydrogen'),
        HydrogenSession.init(request, [env.SESSION_SECRET]),
      ]);

      const handleRequest = createRequestHandler({
        build: remixBuild,
        mode: process.env.NODE_ENV,
        getLoadContext(request) {
          const {storefront, fetch} = createStorefrontClient(
            {
              publicStorefrontToken: env.SHOPIFY_STOREFRONT_API_PUBLIC_TOKEN,
              storeDomain: env.SHOPIFY_STORE_DOMAIN,
              storefrontApiVersion: '2022-10',
              i18n: getLocaleFromRequest(request),
            },
            {
              cache,
              waitUntil,
              buyerIp: getBuyerIp(request),
            },
          );

          return {
            cache,
            session,
            waitUntil,
            storefront,
            fetch,
            env,
          } as AppLoadContext;
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
