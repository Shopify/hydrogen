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
  // Additional context for custom properties, CMS clients, 3P SDKs, etc.
  // These will be available as both context.propertyName and context.get(propertyContext)
  // Example of complex objects that could be added:
  // cms: await createCMSClient(env),
  // reviews: await createReviewsClient(env),
} as const;

// Automatically augment HydrogenAdditionalContext with the additional context type
type AdditionalContextType = typeof additionalContext;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}

  // @description Augment the cart with custom methods for variant selection
  interface HydrogenCustomCartMethods {
    updateLineByOptions: (
      productId: string,
      selectedOptions: SelectedOptionInput[],
      line: CartLineUpdateInput,
    ) => Promise<CartQueryDataReturn>;
  }
}

/**
 * Creates Hydrogen context for React Router 7.9.x
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

  // @description Create a placeholder context first to reference in customMethods
  const hydrogenContext: ReturnType<typeof createHydrogenContext> =
    createHydrogenContext(
      {
        env,
        request,
        cache,
        waitUntil,
        session,
        // Or detect from URL path based on locale subpath, cookies, or any other strategy
        i18n: {language: 'EN', country: 'US'},
        cart: {
          queryFragment: CART_QUERY_FRAGMENT,
          // @description Custom cart method for updating line items by variant options
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
        },
      },
      additionalContext,
    );

  return hydrogenContext;
}
