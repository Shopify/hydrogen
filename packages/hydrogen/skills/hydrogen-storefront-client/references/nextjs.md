# Next.js App Router

## Dynamic pages

Next.js server components don't receive a `Request` object. The pattern: a server-only cached factory that reads `headers()`, creates a request context from those headers, and creates a request-scoped client for that RSC request. The scaffold defaults to a public client; `NEXT_PUBLIC_STOREFRONT_API_TOKEN` may be unset, which means tokenless access (all mock.shop supports). Once the app has a private token and trusted buyer context, switch to `type: "private"` and resolve `buyerIp` per the `hydrogen-storefront-client` buyer-IP guidance (e.g. from trusted `x-forwarded-for` data).

```ts
// lib/storefront.ts
import { headers } from "next/headers";
import { cache } from "react";
import {
  createStorefrontClient,
  createShopifyRequestContext,
} from "@shopify/hydrogen";

export const getStorefrontClient = cache(async () => {
  const requestHeaders = await headers();
  const requestContext = createShopifyRequestContext({
    request: { headers: requestHeaders },
    i18n: { country: "US", language: "EN" },
  });

  return createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: process.env.NEXT_PUBLIC_STORE_DOMAIN!,
      publicStorefrontToken: process.env.NEXT_PUBLIC_STOREFRONT_API_TOKEN,
    },
  });
});
```

```ts
// app/products/[handle]/page.tsx
import { getStorefrontClient } from "@/lib/storefront";
import { gql } from "@shopify/hydrogen";

const PRODUCT_QUERY = gql(`
  query Product($handle: String!) {
    product(handle: $handle) { title description }
  }
`);

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const storefront = await getStorefrontClient();
  const { data } = await storefront.graphql(PRODUCT_QUERY, {
    variables: { handle },
  });
  return <h1>{data?.product?.title}</h1>;
}
```

The client is created inside the request path because `requestContext` is static on the client. Calling `headers()` makes this page dynamic. Route handlers and proxy files receive the actual `Request`; pass that request to `createShopifyRequestContext({ request, i18n })` there so the request URL and `request.signal` are preserved. When upgrading to a private client, also pass the trusted `buyerIp` (`createShopifyRequestContext({ request, i18n, buyerIp })`).

## Static pages (no buyer IP)

Pages that don't need buyer context — product listings, collection grids, marketing pages — can use `private_no_buyer_context` with a static request context. Because the component never calls `headers()`, `cookies()`, or reads `searchParams`, Next.js treats it as statically renderable and caches it at build time or via ISR.

```ts
// lib/storefront-static.ts - private client, no buyer context
import { createStorefrontClient, createShopifyRequestContext } from "@shopify/hydrogen";

const requestContext = createShopifyRequestContext({
  request: { headers: new Headers() },
  i18n: { country: "US", language: "EN" },
});

export const staticStorefrontClient = createStorefrontClient({
  type: "private_no_buyer_context",
  requestContext,
  config: {
    storeDomain: process.env.NEXT_PUBLIC_STORE_DOMAIN!,
    privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
  },
});
```

```ts
// app/collections/[handle]/page.tsx — statically rendered
import { staticStorefrontClient } from "@/lib/storefront-static";
import { gql } from "@shopify/hydrogen";

const COLLECTION_QUERY = gql(`
  query Collection($handle: String!) {
    collection(handle: $handle) {
      title
      products(first: 20) { nodes { title handle } }
    }
  }
`);

export default async function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { data } = await staticStorefrontClient.graphql(COLLECTION_QUERY, {
    variables: { handle },
  });
  return (
    <ul>
      {data?.collection?.products?.nodes?.map((p) => (
        <li key={p.handle}>{p.title}</li>
      ))}
    </ul>
  );
}
```

This component never touches request-time APIs (`headers()`, `cookies()`, `searchParams`). With Cache Components, wrap catalog reads in explicit `"use cache"` functions and choose a `cacheLife` / `cacheTag`; do not use route-segment `revalidate`. All requests share one throttle bucket - fine for pages that serve the same data to every visitor. Use a per-request client from `getStorefrontClient()` (upgraded to `private`) when you need per-buyer isolation or personalized data.

## `use cache` does not serialize `URLSearchParams`

`use cache` serializes its arguments, so a `URLSearchParams` loses `.get` across the boundary. Pass a plain `string` and reconstruct `new URLSearchParams(string)` inside the cache-point:

```ts
// "use cache" cache-point
async function fetchCollection(handle: string, searchString: string) {
  const parsed = parseCollectionParams(new URLSearchParams(searchString));
  // ...
}
```
