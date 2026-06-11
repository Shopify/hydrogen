# Astro

Astro pages run their frontmatter on the server, so `Astro.request` and `Astro.clientAddress` are available — but only on **server-rendered** pages. Prerendered pages have no request at all.

## SSR with buyer isolation

Use `Astro.locals` to pass the storefront client from middleware to pages. The middleware creates the client once per request with buyer IP resolved from `Astro.clientAddress`.

```ts
// src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import {
  createStorefrontClient,
  createStorefrontRequestContext,
} from "@shopify/hydrogen";

export const onRequest = defineMiddleware(async (context, next) => {
  const requestContext = createStorefrontRequestContext(context.request);
  const client = createStorefrontClient({
    type: "private",
    config: {
      storeDomain: import.meta.env.PUBLIC_STORE_DOMAIN,
      privateStorefrontToken: import.meta.env.PRIVATE_STOREFRONT_API_TOKEN,
      buyerIp: context.clientAddress,
      requestContext,
      i18n: { country: "US", language: "EN" },
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
import type { RequestScopedPrivateStorefrontClient } from "@shopify/hydrogen";

declare namespace App {
  interface Locals {
    storefront: RequestScopedPrivateStorefrontClient;
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

This requires `output: "server"` in `astro.config.mjs` (all pages SSR by default). Individual pages that don't need buyer IP can opt into static prerendering with `export const prerender = true`.

## Static pages (no buyer IP)

For prerendered pages — marketing, collection listings — use a module-scoped `private_shared_rate_limit` client. No middleware needed since there's no request to read from.

```ts
// src/lib/storefront-static.ts
import { createStorefrontClient } from "@shopify/hydrogen";

export const staticStorefrontClient = createStorefrontClient({
  type: "private_shared_rate_limit",
  config: {
    storeDomain: import.meta.env.PUBLIC_STORE_DOMAIN,
    privateStorefrontToken: import.meta.env.PRIVATE_STOREFRONT_API_TOKEN,
    i18n: { country: "US", language: "EN" },
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
