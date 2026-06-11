# SolidStart

SolidStart uses Vinxi (Nitro under the hood) and provides middleware via `createMiddleware`. Server-side data fetching happens in `query()` functions marked with `"use server"`, where `getRequestEvent()` gives access to the request.

## SSR with buyer isolation

The middleware creates the client per-request and attaches it to `event.locals`. Server functions retrieve it via `getRequestEvent()`.

```ts
// src/middleware.ts
import { createMiddleware } from "@solidjs/start/middleware";
import {
  createStorefrontClient,
  createStorefrontRequestContext,
} from "@shopify/hydrogen";

export default createMiddleware({
  onRequest: (event) => {
    const buyerIp = event.request.headers.get("cf-connecting-ip");
    if (!buyerIp) throw new Error("cf-connecting-ip is required for private SFAPI clients");
    const requestContext = createStorefrontRequestContext(event.request);

    const client = createStorefrontClient({
      type: "private",
      config: {
        storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
        privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
        buyerIp,
        requestContext,
        i18n: { country: "US", language: "EN" },
      },
    });

    event.locals.storefront = client;
  },
});
```

```ts
// src/lib/storefront.ts — helper to retrieve the client in server functions
import { getRequestEvent } from "solid-js/web";
import type { RequestScopedPrivateStorefrontClient } from "@shopify/hydrogen";

export function getStorefront(): RequestScopedPrivateStorefrontClient {
  const event = getRequestEvent();
  if (!event?.locals?.storefront) {
    throw new Error("Storefront client not found — is the middleware registered?");
  }
  return event.locals.storefront as RequestScopedPrivateStorefrontClient;
}
```

```tsx
// src/routes/products/[handle].tsx
import { query, createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { gql } from "@shopify/hydrogen";
import { getStorefront } from "../lib/storefront";
import { Show } from "solid-js";

const PRODUCT_QUERY = gql(`
  query Product($handle: String!) {
    product(handle: $handle) { title description }
  }
`);

const fetchProduct = query(async (handle: string) => {
  "use server";
  const client = getStorefront();
  const { data } = await client.graphql(PRODUCT_QUERY, {
    variables: { handle },
  });
  return data?.product ?? null;
}, "product");

export const route = {
  preload: ({ params }) => fetchProduct(params.handle),
} satisfies RouteDefinition;

export default function ProductPage() {
  const params = useParams<{ handle: string }>();
  const product = createAsync(() => fetchProduct(params.handle));

  return (
    <Show when={product()}>
      {(p) => <h1>{p().title}</h1>}
    </Show>
  );
}
```

## Forwarding response headers

Use `onBeforeResponse` to merge captured SFAPI headers into the final response.

```ts
// src/middleware.ts — with response header propagation
import { createMiddleware } from "@solidjs/start/middleware";
import {
  createStorefrontClient,
  createStorefrontRequestContext,
} from "@shopify/hydrogen";

export default createMiddleware({
  onRequest: (event) => {
    const buyerIp = event.request.headers.get("cf-connecting-ip");
    if (!buyerIp) throw new Error("cf-connecting-ip is required for private SFAPI clients");
    const requestContext = createStorefrontRequestContext(event.request);

    const client = createStorefrontClient({
      type: "private",
      config: {
        storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
        privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
        buyerIp,
        requestContext,
        i18n: { country: "US", language: "EN" },
      },
    });

    event.locals.storefront = client;
    event.locals.storefrontRequestContext = requestContext;
  },
  onBeforeResponse: (event) => {
    event.locals.storefrontRequestContext?.applyResponseHeaders(event.response.headers);
  },
});
```

## Footguns

- **`"use server"` boundary is mandatory** — `getRequestEvent()` only works inside a `"use server"` function. Calling it outside (e.g. in a component body) returns `undefined` and the storefront client lookup silently fails.
- **`event.nativeEvent` breaks tree-shaking** — accessing the underlying H3 event from Vinxi pulls in the entire H3 runtime. Only use it in server-only files if you need Nitro-specific features.
- **No built-in `getClientAddress()`** — unlike SvelteKit, SolidStart doesn't have a convenience method for the client IP. Do not trust generic proxy headers unless your deployment strips or overwrites them; build `buyerIp` from request data your deployment controls.
