import {
  createHydrogenContext,
  cartLinesUpdateDefault,
  cartGetIdDefault,
} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT, PRODUCT_VARIANT_QUERY} from '~/lib/fragments';
import type {
  SelectedOptionInput,
  CartLineUpdateInput,
} from '@shopify/hydrogen/storefront-api-types';

/**
 * The context implementation is separate from server.ts
 * so that type can be extracted for AppLoadContext
 * */

export type CustomAppLoadContext = Awaited<
  ReturnType<typeof createAppLoadContext>
>;

export async function createAppLoadContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
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

  const hydrogenContext = createHydrogenContext({
    env,
    request,
    cache,
    waitUntil,
    session,
    i18n: {language: 'EN', country: 'US'},
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
          const {product} = await hydrogenContext.storefront.query(
            PRODUCT_VARIANT_QUERY,
            {
              variables: {
                productId,
                selectedOptions,
              },
            },
          );

          const lines = [
            {...line, merchandiseId: product?.selectedVariant?.id},
          ];

          return await cartLinesUpdateDefault({
            storefront: hydrogenContext.storefront,
            getCartId: cartGetIdDefault(request.headers),
          })(lines);
        },
      },
      /**********   EXAMPLE UPDATE END   ************/
      /***********************************************/
    },
  });

  return {
    ...hydrogenContext,
    // declare additional Remix loader context
  };
}
