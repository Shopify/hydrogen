# SvelteKit

## Contents

- SSR
- Forwarding response headers
- Static pages (no buyer IP)
- Footguns

SvelteKit's `handle` hook in `hooks.server.ts` runs on every server request and receives an `event` object with the full `Request`, cookies, and client address. Use `event.locals` to pass the storefront client to `load` functions.

## SSR

The scaffold defaults to a public client; `PUBLIC_STOREFRONT_API_TOKEN` may be unset, which means tokenless access (all mock.shop supports) — read it through `$env/dynamic/public`, since `$env/static/public` fails the build for unset vars. Once the app has a private token and trusted buyer context, switch to `type: "private"` and resolve `buyerIp` (e.g. from `event.getClientAddress()`) per the `hydrogen-storefront-client` buyer-IP guidance.

```ts
// src/hooks.server.ts
import type { Handle } from "@sveltejs/kit";
import {
  createStorefrontClient,
  createShopifyRequestContext,
} from "@shopify/hydrogen";
import { env } from "$env/dynamic/public";
import { PUBLIC_STORE_DOMAIN } from "$env/static/public";

export const handle: Handle = async ({ event, resolve }) => {
  const requestContext = createShopifyRequestContext({
    request: event.request,
    i18n: { country: "US", language: "EN" },
  });
  const client = createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: PUBLIC_STORE_DOMAIN,
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
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
import type { StorefrontClient } from "@shopify/hydrogen";

declare global {
  namespace App {
    interface Locals {
      storefront: StorefrontClient;
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
import { env } from "$env/dynamic/public";
import { PUBLIC_STORE_DOMAIN } from "$env/static/public";

export const handle: Handle = async ({ event, resolve }) => {
  const requestContext = createShopifyRequestContext({
    request: event.request,
    i18n: { country: "US", language: "EN" },
  });

  const client = createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: PUBLIC_STORE_DOMAIN,
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    },
  });

  event.locals.storefront = client;

  const response = await resolve(event);
  requestContext.applyResponseHeaders(response.headers);
  return response;
};
```

## Static pages (no buyer IP)

For prerendered pages, use a module-scoped `private_no_buyer_context` client and export `prerender = true`.

```ts
// src/lib/storefront-static.ts
import { createStorefrontClient, createShopifyRequestContext } from "@shopify/hydrogen";
import { PRIVATE_STOREFRONT_API_TOKEN } from "$env/static/private";
import { PUBLIC_STORE_DOMAIN } from "$env/static/public";

const requestContext = createShopifyRequestContext({
  request: { headers: new Headers() },
  i18n: { country: "US", language: "EN" },
});

export const staticStorefrontClient = createStorefrontClient({
  type: "private_no_buyer_context",
  requestContext,
  config: {
    storeDomain: PUBLIC_STORE_DOMAIN,
    privateStorefrontToken: PRIVATE_STOREFRONT_API_TOKEN,
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

- **`event.getClientAddress()` needs proxy config** — relevant when upgrading to a private client that resolves `buyerIp` from it. Behind a reverse proxy, the raw address is the proxy's IP, not the buyer's. Set the `ADDRESS_HEADER` env var (e.g. `ADDRESS_HEADER=X-Forwarded-For`) and `XFF_DEPTH` to the number of trusted proxies so SvelteKit reads the correct IP from the right end of the header.
- **`filterSerializedResponseHeaders` is unrelated** — this option on `resolve()` controls which headers from SvelteKit's internal `fetch()` calls are serialized into the HTML for client-side hydration. It does not affect the actual HTTP response headers. Don't confuse it with forwarding SFAPI headers.
