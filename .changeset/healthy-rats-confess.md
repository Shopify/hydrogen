---
'skeleton': patch
'@shopify/create-hydrogen': patch
---

Use type `HydrogenContext` for all the env.d.ts

```diff
// in env.d.ts

+ import type {HydrogenContext} from '@shopify/hydrogen';

+ interface AppLoadContext extends HydrogenContext
- interface AppLoadContext {
  env: Env;
-  cart: HydrogenCart;
-  storefront: Storefront;
-  customerAccount: CustomerAccount;
  session: AppSession;
  waitUntil: ExecutionContext['waitUntil'];
}

```
