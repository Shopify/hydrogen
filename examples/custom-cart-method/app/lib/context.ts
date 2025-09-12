import {
  createHydrogenContext,
  cartLinesUpdateDefault,
  cartGetIdDefault,
  type CartQueryDataReturn,
} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT, PRODUCT_VARIANT_QUERY} from '~/lib/fragments';
import type {
  SelectedOptionInput,
  CartLineUpdateInput,
} from '@shopify/hydrogen/storefront-api-types';

// Define the additional context object
const additionalContext = {
  // Additional context for custom properties
} as const;

// Automatically augment HydrogenAdditionalContext with the additional context type
type AdditionalContextType = typeof additionalContext;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}
  
  // Augment the cart with custom methods for this example
  interface HydrogenCustomCartMethods {
    updateLineByOptions: (
      productId: string,
      selectedOptions: SelectedOptionInput[],
      line: CartLineUpdateInput,
    ) => Promise<CartQueryDataReturn>;
  }
}

/**
 * Creates Hydrogen context for React Router 7.8.x with custom cart methods
 * Returns HydrogenRouterContextProvider with hybrid access patterns
 * */
export async function createHydrogenRouterContext(
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

  // Create a placeholder context first to reference in customMethods
  const hydrogenContext: ReturnType<typeof createHydrogenContext> = createHydrogenContext(
    {
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
        // Avoid using method definition in customMethods ie. methodDefinition() {}
        // as TypeScript is unable to correctly infer the type
        // if method definition is necessary, declaring customMethods separately
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
    },
    additionalContext,
  );

  return hydrogenContext;
}
