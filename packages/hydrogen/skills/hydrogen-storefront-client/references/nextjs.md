# Next.js App Router

## Dynamic pages (per-buyer isolation)

Next.js server components don't receive a `Request` object, but private clients need a request-derived buyer IP. The pattern: a server-only cached factory that reads `headers()`, creates a request context from those headers, resolves buyer IP from trusted request data, and creates a private client for that RSC request.

```ts
// app/lib/storefront.ts
import { headers } from "next/headers";
import { cache } from "react";
import {
  createStorefrontClient,
  createStorefrontRequestContext,
} from "@shopify/hydrogen";

const FIRST_FORWARDED_FOR_VALUE_INDEX = 0;

export const createStorefront = cache(async () => {
  const requestHeaders = await headers();
  const requestContext = createStorefrontRequestContext({ headers: requestHeaders });
  const forwardedForValues = requestHeaders.get("x-forwarded-for")?.split(",");
  const buyerIp = forwardedForValues?.[FIRST_FORWARDED_FOR_VALUE_INDEX]?.trim();
  if (!buyerIp) throw new Error("buyer IP is required for private SFAPI clients");

  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
      buyerIp,
      requestContext,
      i18n: { country: "US", language: "EN" },
    },
  });
});
```

```ts
// app/products/[handle]/page.tsx
import { createStorefront } from "@/lib/storefront";
import { gql } from "@shopify/hydrogen";

const PRODUCT_QUERY = gql(`
  query Product($handle: String!) {
    product(handle: $handle) { title description }
  }
`);

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const storefront = await createStorefront();
  const { data } = await storefront.graphql(PRODUCT_QUERY, {
    variables: { handle },
  });
  return <h1>{data?.product?.title}</h1>;
}
```

The private client is created inside the request path because `buyerIp` and `requestContext` are static on the client. Calling `headers()` makes this page dynamic. Route handlers and proxy files receive the actual `Request`; pass that request to `createStorefrontRequestContext(request)` there so the request URL and `request.signal` are preserved.

## Static pages (no buyer IP)

Pages that don't need per-buyer isolation — product listings, collection grids, marketing pages — can use `private_shared_rate_limit` with static `i18n`. Because the component never calls `headers()`, `cookies()`, or reads `searchParams`, Next.js treats it as statically renderable and caches it at build time or via ISR.

```ts
// app/lib/storefront-static.ts — shared-rate-limit client, no buyer IP
import { createStorefrontClient } from "@shopify/hydrogen";

export const staticStorefrontClient = createStorefrontClient({
  type: "private_shared_rate_limit",
  config: {
    storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
    privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
    i18n: { country: "US", language: "EN" },
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

This component never touches request-time APIs (`headers()`, `cookies()`, `searchParams`), so Next.js can prerender it at build time or cache it with ISR (`export const revalidate = 3600`). All requests share one throttle bucket — fine for pages that serve the same data to every visitor. Use a per-request `private` client from `createStorefront()` when you need per-buyer isolation or personalized data.
