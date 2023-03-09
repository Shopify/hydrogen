---
'@shopify/hydrogen-react': patch
'@shopify/remix-oxygen': patch
'@shopify/hydrogen': patch
---

Fix active cart session event in Live View

Introducing `getStorefrontHeaders` that collects the required Shopify headers for making a
Storefront API call.

- Make cart constants available as exports from `@shopify/hydrogen-react`
- Deprecating `buyerIp` and `requestGroupId` props from `createStorefrontClient` from `@shopify/hydrogen`
- Deprecating `getBuyerIp` function from `@shopify/remix-oxygen`

```diff
+ import {getStorefrontHeaders} from '@shopify/remix-oxygen';
import {createStorefrontClient, storefrontRedirect} from '@shopify/hydrogen';

export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {

    const {storefront} = createStorefrontClient({
      cache,
      waitUntil,
-     buyerIp: getBuyerIp(request),
      i18n: {language: 'EN', country: 'US'},
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
      storeDomain: `https://${env.PUBLIC_STORE_DOMAIN}`,
      storefrontApiVersion: env.PUBLIC_STOREFRONT_API_VERSION || '2023-01',
      storefrontId: env.PUBLIC_STOREFRONT_ID,
-     requestGroupId: request.headers.get('request-id'),
+     storefrontHeaders: getStorefrontHeaders(request),
    });
```
