---
'skeleton': patch
'@shopify/create-hydrogen': patch
---

Use `createHydrogenContext` for all the server.ts, ensure to overwrite any options that is not using the default values.

```diff
// in env.d.ts
+ interface AppLoadContext extends HydrogenContext<AppSession> {
- interface AppLoadContext {
-  env: Env;
-  cart: HydrogenCart;
-  storefront: Storefront;
-  customerAccount: CustomerAccount;
-  session: AppSession;
-  waitUntil: ExecutionContext['waitUntil'];
}
```

```diff
// in server.ts

import {
-  cartGetIdDefault,
-  cartSetIdDefault,
-  createCartHandler,
-  createStorefrontClient,
  storefrontRedirect,
-  createCustomerAccountClient,
+  createHydrogenContext,
} from '@shopify/hydrogen';
import {
  createRequestHandler,
-  getStorefrontHeaders,
  type AppLoadContext,
} from '@shopify/remix-oxygen';

+ const hydrogenContext = createHydrogenContext<AppSession>({
+   env,
+   request,
+   cache,
+   waitUntil,
+   session,
+   i18n: {language: 'EN', country: 'US'},
+   cart: {
+     queryFragment: CART_QUERY_FRAGMENT,
+   },
+ });

- const {storefront} = createStorefrontClient({
-   cache,
-   waitUntil,
-   i18n: {language: 'EN', country: 'US'},
-   publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
-   privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
-   storeDomain: env.PUBLIC_STORE_DOMAIN,
-   storefrontId: env.PUBLIC_STOREFRONT_ID,
-   storefrontHeaders: getStorefrontHeaders(request),
- });

- const customerAccount = createCustomerAccountClient({
-   waitUntil,
-   request,
-   session,
-   customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
-   customerAccountUrl: env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
- });

- const cart = createCartHandler({
-   storefront,
-   customerAccount,
-   getCartId: cartGetIdDefault(request.headers),
-   setCartId: cartSetIdDefault(),
-   cartQueryFragment: CART_QUERY_FRAGMENT,
- });

const handleRequest = createRequestHandler({
  build: remixBuild,
  mode: process.env.NODE_ENV,
-  getLoadContext: (): AppLoadContext => ({
+    ...hydrogenContext,
-    session,
-    storefront,
-    customerAccount,
-    cart,
-    env,
-    waitUntil,
-  }),
});

```
