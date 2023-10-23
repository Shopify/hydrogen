import {
  createStorefrontClient,
  createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
} from '@shopify/hydrogen';
import * as remixBuild from '@remix-run/dev/server-build';
import {createRequestHandler} from '@shopify/remix-oxygen';

export default {
  async fetch(request, env, executionContext) {
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
      build: remixBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => ({
        storefront,
        cart, // Pass the cart api instance to the loader context.
      }),
    });

    return await handleRequest(request);
  },
};
