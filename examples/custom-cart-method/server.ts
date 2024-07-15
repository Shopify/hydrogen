// @ts-ignore
// Virtual entry point for the app
import * as remixBuild from 'virtual:remix/server-build';
import {
  cartGetIdDefault,
  storefrontRedirect,
  cartLinesUpdateDefault,
  createShopifyHandler,
} from '@shopify/hydrogen';
import {createRequestHandler, type AppLoadContext} from '@shopify/remix-oxygen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT, PRODUCT_VARIANT_QUERY} from '~/lib/fragments';
import type {
  SelectedOptionInput,
  CartLineUpdateInput,
} from '@shopify/hydrogen/storefront-api-types';

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
        cart: {
          queryFragment: CART_QUERY_FRAGMENT,
          /***********************************************/
          /**********  EXAMPLE UPDATE STARTS  ************/
          customMethods: {
            updateLineByOptions: async (
              productId: string,
              selectedOptions: SelectedOptionInput[],
              line: CartLineUpdateInput,
            ) => {
              const {product} = await storefront.query(PRODUCT_VARIANT_QUERY, {
                variables: {
                  productId,
                  selectedOptions,
                },
              });

              const lines = [
                {...line, merchandiseId: product?.selectedVariant?.id},
              ];

              return await cartLinesUpdateDefault({
                storefront,
                getCartId: cartGetIdDefault(request.headers),
              })(lines);
            },
          },
          /**********   EXAMPLE UPDATE END   ************/
          /***********************************************/
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
          customerAccount,
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
