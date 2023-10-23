import {storefrontRedirect, createStorefrontClient} from '@shopify/hydrogen';
import * as remixBuild from '@remix-run/dev/server-build';
import {createRequestHandler} from '@shopify/remix-oxygen';

export default {
  async fetch(request, env, executionContext) {
    const {storefront} = createStorefrontClient({
      request,
      cache: await caches.open('hydrogen'),
      waitUntil: executionContext.waitUntil.bind(executionContext),
      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      storeDomain: env.PUBLIC_STORE_DOMAIN,
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
