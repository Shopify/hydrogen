// @ts-ignore
// Virtual entry point for the app
import * as remixBuild from 'virtual:remix/server-build';
import {
  cartGetIdDefault,
  cartSetIdDefault,
  createCartHandler,
  createStorefrontClient,
  storefrontRedirect,
  createShopifyHandler,
} from '@shopify/hydrogen';
import {
  createRequestHandler,
  getStorefrontHeaders,
  type AppLoadContext,
} from '@shopify/remix-oxygen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';

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
       * Open a cache instance in the worker and a custom session instance.
       */
      if (!env?.SESSION_SECRET) {
        throw new Error('SESSION_SECRET environment variable is not set');
      }

      const waitUntil = executionContext.waitUntil.bind(executionContext);
      const [cache, session] = await Promise.all([
        caches.open('hydrogen'),
        AppSession.init(request, [env.SESSION_SECRET]),
      ]);

      const {storefront, customerAccount, cart} = createShopifyHandler({
        env,
        request,
        cache,
        waitUntil,
        session,
        /***********************************************/
        /**********  EXAMPLE UPDATE STARTS  ************/
        customerAccountClientOptions: {
          useLegacy: true,
        },
        /**********   EXAMPLE UPDATE END   ************/
        /***********************************************/
        cartOptions: {
          cartQueryFragment: CART_QUERY_FRAGMENT,
        },
      });

      /**
       * Create a Remix request handler and pass
       * Hydrogen's Storefront client to the loader context.
       */
      const handleRequest = createRequestHandler({
        build: remixBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: (): AppLoadContext => ({
          session,
          storefront,
          cart,
          env,
          waitUntil,
        }),
      });

      const response = await handleRequest(request);

      if (session.isPending) {
        response.headers.set('Set-Cookie', await session.commit());
      }

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({request, response, storefront});
      }

      return response;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
