import {createStorefrontClient} from '@shopify/hydrogen';
// @ts-expect-error
import * as serverBuild from 'virtual:react-router/server-build';
import {
  createRequestHandler,
  getStorefrontHeaders,
} from '@shopify/remix-oxygen';

export default {
  async fetch(
    request: Request,
    env: Record<string, string>,
    executionContext: ExecutionContext,
  ) {
    /* Create a Storefront client with your credentials and options */
    const {storefront} = createStorefrontClient({
      /* Cache API instance */
      cache: await caches.open('hydrogen'),
      /* Runtime utility in serverless environments */
      waitUntil: (p: Promise<unknown>) => executionContext.waitUntil(p),
      /* Private Storefront API token for your store */
      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
      /* Public Storefront API token for your store */
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      /* Your store domain: "{shop}.myshopify.com" */
      storeDomain: env.PUBLIC_STORE_DOMAIN,
      /**
       * Storefront API headers containing:
       * - buyerIp: The IP address of the customer.
       * - requestGroupId: A unique ID to group all the logs for this request.
       * - cookie: The 'cookie' header from the request.
       */
      storefrontHeaders: getStorefrontHeaders(request),
    });

    const handleRequest = createRequestHandler({
      build: serverBuild,
      mode: process.env.NODE_ENV,
      /* Inject the Storefront client in the Remix context */
      getLoadContext: () => ({storefront}),
    });

    return handleRequest(request);
  },
};
