---
'@shopify/hydrogen': patch
---

Fix Add-to-cart session event in Live View

### Breaking change

`createStorefrontClient` now requires `request` to be passed in.

```diff
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {

    const {storefront} = createStorefrontClient({
+     request,
      cache,
      waitUntil,
      buyerIp: getBuyerIp(request),
      i18n: {language: 'EN', country: 'US'},
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
      storeDomain: `https://${env.PUBLIC_STORE_DOMAIN}`,
      storefrontApiVersion: env.PUBLIC_STOREFRONT_API_VERSION || '2023-01',
      storefrontId: env.PUBLIC_STOREFRONT_ID,
      requestGroupId: request.headers.get('request-id'),
    });
```
