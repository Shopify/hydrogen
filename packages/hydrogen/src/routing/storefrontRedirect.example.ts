import {storefrontRedirect, createStorefrontClient} from '@shopify/hydrogen';
import * as remixBuild from '@remix-run/dev/server-build';
import {
  createRequestHandler,
  getStorefrontHeaders,
} from '@shopify/remix-oxygen';

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const {storefront} = createStorefrontClient({
      cache: await caches.open('hydrogen'),
      waitUntil: (p: Promise<unknown>) => executionContext.waitUntil(p),
      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      storeDomain: env.PUBLIC_STORE_DOMAIN,
      storefrontHeaders: getStorefrontHeaders(request),
    });

    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
    });

    const response = await handleRequest(request);

    if (response.status === 404) {
      /**
       * Check for redirects only when there's a 404 from
       * the app. If the redirect doesn't exist, then
       * `storefrontRedirect` will pass through the 404
       * response.
       */
      return storefrontRedirect({request, response, storefront});
    }

    return response;
  },
};
