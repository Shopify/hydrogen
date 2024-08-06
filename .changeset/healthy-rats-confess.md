---
'skeleton': patch
---

1. Create a app/lib/context file and use `createHydrogenContext` in it.

```.ts
// in app/lib/context

import {createHydrogenContext} from '@shopify/hydrogen';

export async function createAppLoadContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
    const hydrogenContext = createHydrogenContext({
      env,
      request,
      cache,
      waitUntil,
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
      // ensure to overwrite any options that is not using the default values from your server.ts
    });

  return {
    ...hydrogenContext,
    // declare additional Remix loader context
  };
}

```

2. Use `createAppLoadContext` method in server.ts Ensure to overwrite any options that is not using the default values in `createHydrogenContext`.

```diff
// in server.ts

- import {
-   createCartHandler,
-   createStorefrontClient,
-   createCustomerAccountClient,
- } from '@shopify/hydrogen';
+ import {createAppLoadContext} from '~/lib/context';

export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {

-   const {storefront} = createStorefrontClient(
-     ...
-   );

-   const customerAccount = createCustomerAccountClient(
-     ...
-   );

-   const cart = createCartHandler(
-     ...
-   );

+   const appLoadContext = await createAppLoadContext(
+      request,
+      env,
+      executionContext,
+   );

    /**
      * Create a Remix request handler and pass
      * Hydrogen's Storefront client to the loader context.
      */
    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
-      getLoadContext: (): AppLoadContext => ({
-        session,
-        storefront,
-        customerAccount,
-        cart,
-        env,
-        waitUntil,
-      }),
+      getLoadContext: () => appLoadContext,
    });
  }
```

3. Use infer type for AppLoadContext in env.d.ts

```diff
// in env.d.ts

+ import type {createAppLoadContext} from '~/lib/context';

+ interface AppLoadContext extends Awaited<ReturnType<typeof createAppLoadContext>> {
- interface AppLoadContext {
-  env: Env;
-  cart: HydrogenCart;
-  storefront: Storefront;
-  customerAccount: CustomerAccount;
-  session: AppSession;
-  waitUntil: ExecutionContext['waitUntil'];
}

```
