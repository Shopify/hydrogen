---
'skeleton': patch
'@shopify/create-hydrogen': patch
---

Use type `HydrogenEnv` for all the env.d.ts

```diff
// in env.d.ts

+ import type {HydrogenEnv} from '@shopify/hydrogen';

+ interface Env extends HydrogenEnv {}
- interface Env {
-   SESSION_SECRET: string;
-  PUBLIC_STOREFRONT_API_TOKEN: string;
-  PRIVATE_STOREFRONT_API_TOKEN: string;
-  PUBLIC_STORE_DOMAIN: string;
-  PUBLIC_STOREFRONT_ID: string;
-  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
-  PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;
-  PUBLIC_CHECKOUT_DOMAIN: string;
- }

```
