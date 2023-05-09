// Virtual entry point for the app
import * as remixBuild from '@remix-run/dev/server-build';
import {
  createRequestHandler,
  getStorefrontHeaders,
} from '@shopify/remix-oxygen';
import {
  createCartApi,
  createStorefrontClient,
  storefrontRedirect,
} from '@shopify/hydrogen';
import {HydrogenSession} from '~/lib/session.server';
import {getLocaleFromRequest} from '~/lib/utils';
import {myCartQueries} from '~/lib/cart-queries.server';
import {parse as parseCookie} from 'worktop/cookie';

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

      const waitUntil = (p: Promise<any>) => executionContext.waitUntil(p);
      const [cache, session] = await Promise.all([
        caches.open('hydrogen'),
        HydrogenSession.init(request, [env.SESSION_SECRET]),
      ]);

      /**
       * Create Hydrogen's Storefront client.
       */
      const {storefront} = createStorefrontClient({
        cache,
        waitUntil,
        i18n: getLocaleFromRequest(request),
        publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
        privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
        storeDomain: `https://${env.PUBLIC_STORE_DOMAIN}`,
        storefrontApiVersion: env.PUBLIC_STOREFRONT_API_VERSION || '2023-04',
        storefrontId: env.PUBLIC_STOREFRONT_ID,
        storefrontHeaders: getStorefrontHeaders(request),
      });

      const cart = createCartApi({
        storefront,
        requestHeaders: request.headers,
      });

      // const MY_CART_QUERY = `#graphql
      //   query CartQuery(
      //     $id: ID!
      //     $numCartLines: Int = 100
      //     $country: CountryCode = ZZ
      //     $language: LanguageCode
      //   ) @inContext(country: $country, language: $language) {
      //     cart(id: $cartId) {
      //       id
      //       checkoutUrl
      //       totalQuantity
      //       lines(first: $numCartLines) {
      //         edges {
      //           node {
      //             id
      //           }
      //         }
      //       }
      //     }
      //   }
      // `;

      // only $cartId, ...
      // no other variables exist
      // const MY_CART_MUTATE_FRAGMENT = `#graphql
      //   fragment CartFragment on Cart {
      //     id
      //     totalQuantity
      //   }
      // `;

      // createCartApi({
      //   storefront,
      //   requestHeaders: request.headers,
      //   cartQueryFragment: MY_CART_QUERY, // Only used by cartGetDefault
      //   cartMutateFragment: MY_CART_MUTATE_FRAGMENT, // Used by all mutation queries
      //   // Problems:
      //   // - lost connection to the default getCartId
      //   // - can type definition be overrided?
      //   customMethods: {
      //     addLine: () => {}, // override default method
      //     magic: () => {},  // figure out how to type infer this as part of return type of createCartApi?
      //   },
      // });

      // Decisions:
      // - Bring in cart fragment
      // Don't pass in request - instead pass in header
      // - Another PR: output graphql query in its entirety when errors happens

      /**
       * Create a Remix request handler and pass
       * Hydrogen's Storefront client to the loader context.
       */
      const handleRequest = createRequestHandler({
        build: remixBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => ({
          session,
          waitUntil,
          storefront,
          cart,
          env,
        }),
      });

      const response = await handleRequest(request);

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
