# Astro

Astro pages run their frontmatter on the server, so `Astro.request` and `Astro.clientAddress` are available — but only on **server-rendered** pages. Prerendered pages have no request at all.

## SSR

Use `Astro.locals` to pass the storefront client from middleware to pages. The middleware creates the client once per request. The scaffold defaults to a public client; `PUBLIC_STOREFRONT_API_TOKEN` may be unset, which means tokenless access (all mock.shop supports). Once the app has a private token and trusted buyer context, switch to `type: "private"` and resolve `buyerIp` (e.g. from `Astro.clientAddress`) per the `hydrogen-storefront-client` buyer-IP guidance.

```ts
// src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import {
  createStorefrontClient,
  createShopifyRequestContext,
} from "@shopify/hydrogen";

export const onRequest = defineMiddleware(async (context, next) => {
  const requestContext = createShopifyRequestContext({
    request: context.request,
    i18n: { country: "US", language: "EN" },
  });
  const client = createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: import.meta.env.PUBLIC_STORE_DOMAIN,
      publicStorefrontToken: import.meta.env.PUBLIC_STOREFRONT_API_TOKEN,
    },
  });

  context.locals.storefront = client;

  const response = await next();
  requestContext.applyResponseHeaders(response.headers);
  return response;
});
```

```ts
// src/env.d.ts — type the locals object
import type { StorefrontClient } from "@shopify/hydrogen";

declare namespace App {
  interface Locals {
    storefront: StorefrontClient;
  }
}
```

```astro
---
// src/pages/products/[handle].astro — server-rendered page
import { gql } from "@shopify/hydrogen";

const PRODUCT_QUERY = gql(`
  query Product($handle: String!) {
    product(handle: $handle) { title description }
  }
`);

const { handle } = Astro.params;
const { data } = await Astro.locals.storefront.graphql(PRODUCT_QUERY, {
  variables: { handle: handle! },
});
---
<h1>{data?.product?.title}</h1>
```

This requires `output: "server"` in `astro.config.mjs` (all pages SSR by default). Individual pages that don't need request-time data can opt into static prerendering with `export const prerender = true`.

## Static pages (no buyer IP)

For prerendered pages — marketing, collection listings — use a module-scoped `private_no_buyer_context` client. No middleware needed since there's no request to read from.

```ts
// src/lib/storefront-static.ts
import { createStorefrontClient, createShopifyRequestContext } from "@shopify/hydrogen";

const requestContext = createShopifyRequestContext({
  request: { headers: new Headers() },
  i18n: { country: "US", language: "EN" },
});

export const staticStorefrontClient = createStorefrontClient({
  type: "private_no_buyer_context",
  requestContext,
  config: {
    storeDomain: import.meta.env.PUBLIC_STORE_DOMAIN,
    privateStorefrontToken: import.meta.env.PRIVATE_STOREFRONT_API_TOKEN,
  },
});
```

```astro
---
// src/pages/collections/[handle].astro
export const prerender = true;

import { gql } from "@shopify/hydrogen";
import { staticStorefrontClient } from "../../lib/storefront-static";

const COLLECTION_QUERY = gql(`
  query Collection($handle: String!) {
    collection(handle: $handle) {
      title
      products(first: 20) { nodes { title handle } }
    }
  }
`);

const { handle } = Astro.params;
const { data } = await staticStorefrontClient.graphql(COLLECTION_QUERY, {
  variables: { handle: handle! },
});
---
<ul>
  {data?.collection?.products?.nodes?.map((p) => <li>{p.title}</li>)}
</ul>
```

## Footguns

- **`Astro.clientAddress` crashes prerendered pages** — it's only available during server rendering. Never access it (or `Astro.request`) in a page with `export const prerender = true`.
- **Middleware runs on every request, including prerendered** — the `handle` hook fires even for prerendered routes. Guard buyer-context logic with a check if needed, or accept that the middleware sets up a client that simply won't be used on static pages.
- **Astro v5 merged `hybrid` into `static`** — use `output: "server"` for SSR-by-default with static opt-in, or `output: "static"` (default) with `export const prerender = false` per-route for on-demand rendering.
