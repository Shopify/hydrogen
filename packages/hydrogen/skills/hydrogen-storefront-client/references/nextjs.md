# Next.js App Router

## Dynamic pages (trusted buyer context)

Next.js server components don't receive a `Request` object, but private clients need a request-derived buyer IP. The pattern: a server-only cached factory that reads `headers()`, creates a request context from those headers, resolves buyer IP from trusted request data, and creates a private client for that RSC request.

```ts
// app/lib/storefront.ts
import { headers } from "next/headers";
import { cache } from "react";
import {
  createStorefrontClient,
  createShopifyRequestContext,
} from "@shopify/hydrogen";

const FIRST_FORWARDED_FOR_VALUE_INDEX = 0;

export const getStorefrontClient = cache(async () => {
  const requestHeaders = await headers();
  const requestContext = createShopifyRequestContext({
    request: { headers: requestHeaders },
    i18n: { country: "US", language: "EN" },
  });
  const forwardedForValues = requestHeaders.get("x-forwarded-for")?.split(",");
  const buyerIp = forwardedForValues?.[FIRST_FORWARDED_FOR_VALUE_INDEX]?.trim();
  if (!buyerIp) throw new Error("buyer IP is required for private SFAPI clients");

  return createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
      buyerIp,
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

The private client is created inside the request path because `buyerIp` and `requestContext` are static on the client. Calling `headers()` makes this page dynamic. Route handlers and proxy files receive the actual `Request`; pass that request to `createShopifyRequestContext({ request, i18n })` there so the request URL and `request.signal` are preserved.

## Static pages (no buyer IP)

Pages that don't need buyer context — product listings, collection grids, marketing pages — can use `private_no_buyer_context` with a static request context. Because the component never calls `headers()`, `cookies()`, or reads `searchParams`, Next.js treats it as statically renderable and caches it at build time or via ISR.

```ts
// app/lib/storefront-static.ts — private client, no buyer context
import { createStorefrontClient, createShopifyRequestContext } from "@shopify/hydrogen";

const requestContext = createShopifyRequestContext({
  request: { headers: new Headers() },
  i18n: { country: "US", language: "EN" },
});

export const staticStorefrontClient = createStorefrontClient({
  type: "private_no_buyer_context",
  requestContext,
  config: {
    storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
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

This component never touches request-time APIs (`headers()`, `cookies()`, `searchParams`), so Next.js can prerender it at build time or cache it with ISR (`export const revalidate = 3600`). Use a per-request `private` client from `getStorefrontClient()` when you need buyer context or personalized data.
