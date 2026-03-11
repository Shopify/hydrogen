import {
  createStorefrontClient,
  handleProxyStandardRoutes,
} from '@shopify/hydrogen';
import {getStorefrontHeaders} from '@shopify/hydrogen/oxygen';

export default {
  async fetch(
    request: Request,
    env: Record<string, string>,
    executionContext: ExecutionContext,
  ) {
    const {storefront} = createStorefrontClient({
      cache: await caches.open('hydrogen'),
      waitUntil: executionContext.waitUntil.bind(executionContext),
      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      storeDomain: env.PUBLIC_STORE_DOMAIN,
      storefrontHeaders: getStorefrontHeaders(request),
    });

    const proxyResponse = handleProxyStandardRoutes({request, storefront});

    if (proxyResponse) {
      return proxyResponse;
    }

    return new Response('Handle the rest of your app here.');
  },
};
