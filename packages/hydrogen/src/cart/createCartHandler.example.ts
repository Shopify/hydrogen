import {
  createStorefrontClient,
  createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
  createRequestHandler,
} from '@shopify/hydrogen';
import * as reactRouterBuild from 'virtual:react-router/server-build';

export default {
  async fetch(
    request: Request,
    env: Record<string, string>,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    const {storefront} = createStorefrontClient({
      /* client parameters */
    });

    // Create a cart api instance.
    const cart = createCartHandler({
      storefront,
      getCartId: cartGetIdDefault(request.headers),
      setCartId: cartSetIdDefault(),
    });

    const handleRequest = createRequestHandler({
      build: reactRouterBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => ({
        storefront,
        cart, // Pass the cart api instance to the loader context.
      }),
    });

    return await handleRequest(request);
  },
};
