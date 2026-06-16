# SvelteKit

SvelteKit's `handle` hook in `hooks.server.ts` runs on every server request and receives an `event` object with the full `Request`, cookies, and client address. Use `event.locals` to pass the storefront client to `load` functions.

## SSR with buyer isolation

```ts
// src/hooks.server.ts
import type { Handle } from "@sveltejs/kit";
import {
  createStorefrontClient,
  createStorefrontRequestContext,
} from "@shopify/hydrogen";
import { PRIVATE_STOREFRONT_API_TOKEN } from "$env/static/private";
import { PUBLIC_STORE_DOMAIN } from "$env/static/public";

export const handle: Handle = async ({ event, resolve }) => {
  const requestContext = createStorefrontRequestContext(event.request);
  const client = createStorefrontClient({
    type: "private",
    config: {
      storeDomain: PUBLIC_STORE_DOMAIN,
      privateStorefrontToken: PRIVATE_STOREFRONT_API_TOKEN,
      buyerIp: event.getClientAddress(),
      requestContext,
      i18n: { country: "US", language: "EN" },
    },
  });

  event.locals.storefront = client;

  const response = await resolve(event);
  requestContext.applyResponseHeaders(response.headers);
  return response;
};
```

```ts
// src/app.d.ts — type the locals object
import type { RequestScopedPrivateStorefrontClient } from "@shopify/hydrogen";

declare global {
  namespace App {
    interface Locals {
      storefront: RequestScopedPrivateStorefrontClient;
    }
  }
}

export {};
```

```ts
// src/routes/products/[handle]/+page.server.ts
import { error } from "@sveltejs/kit";
import { gql } from "@shopify/hydrogen";
import type { PageServerLoad } from "./$types";

const PRODUCT_QUERY = gql(`
  query Product($handle: String!) {
    product(handle: $handle) { title description }
  }
`);

export const load: PageServerLoad = async ({ params, locals }) => {
  const { data } = await locals.storefront.graphql(PRODUCT_QUERY, {
    variables: { handle: params.handle },
  });
  if (!data?.product) error(404, "Product not found");
  return { product: data.product };
};
```

## Forwarding response headers

`requestContext` captures SFAPI response headers. Apply them to the framework response after routing.

```ts
// src/hooks.server.ts — response header propagation
import { PRIVATE_STOREFRONT_API_TOKEN } from "$env/static/private";
import { PUBLIC_STORE_DOMAIN } from "$env/static/public";

export const handle: Handle = async ({ event, resolve }) => {
  const requestContext = createStorefrontRequestContext(event.request);

  const client = createStorefrontClient({
    type: "private",
    config: {
      storeDomain: PUBLIC_STORE_DOMAIN,
      privateStorefrontToken: PRIVATE_STOREFRONT_API_TOKEN,
      buyerIp: event.getClientAddress(),
      requestContext,
      i18n: { country: "US", language: "EN" },
    },
  });

  event.locals.storefront = client;

  const response = await resolve(event);
  requestContext.applyResponseHeaders(response.headers);
  return response;
};
```

## Static pages (no buyer IP)

For prerendered pages, use a module-scoped `private_shared_rate_limit` client and export `prerender = true`.

```ts
// src/lib/storefront-static.ts
import { createStorefrontClient } from "@shopify/hydrogen";
import { PRIVATE_STOREFRONT_API_TOKEN } from "$env/static/private";
import { PUBLIC_STORE_DOMAIN } from "$env/static/public";

export const staticStorefrontClient = createStorefrontClient({
  type: "private_shared_rate_limit",
  config: {
    storeDomain: PUBLIC_STORE_DOMAIN,
    privateStorefrontToken: PRIVATE_STOREFRONT_API_TOKEN,
    i18n: { country: "US", language: "EN" },
  },
});
```

```ts
// src/routes/collections/[handle]/+page.server.ts
import { gql } from "@shopify/hydrogen";
import { staticStorefrontClient } from "$lib/storefront-static";
import type { PageServerLoad } from "./$types";

export const prerender = true;

const COLLECTION_QUERY = gql(`
  query Collection($handle: String!) {
    collection(handle: $handle) {
      title
      products(first: 20) { nodes { title handle } }
    }
  }
`);

export const load: PageServerLoad = async ({ params }) => {
  const { data } = await staticStorefrontClient.graphql(COLLECTION_QUERY, {
    variables: { handle: params.handle },
  });
  return { collection: data?.collection };
};
```

## Footguns

- **`event.getClientAddress()` needs proxy config** — behind a reverse proxy, the raw address is the proxy's IP, not the buyer's. Set the `ADDRESS_HEADER` env var (e.g. `ADDRESS_HEADER=X-Forwarded-For`) and `XFF_DEPTH` to the number of trusted proxies so SvelteKit reads the correct IP from the right end of the header.
- **`filterSerializedResponseHeaders` is unrelated** — this option on `resolve()` controls which headers from SvelteKit's internal `fetch()` calls are serialized into the HTML for client-side hydration. It does not affect the actual HTTP response headers. Don't confuse it with forwarding SFAPI headers.
