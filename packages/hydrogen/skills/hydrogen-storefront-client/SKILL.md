---
name: hydrogen-storefront-client
description: >
  Guide for @shopify/hydrogen — the type-safe Storefront API
  GraphQL client. Use this skill whenever writing, modifying, or reviewing code that
  creates a storefront client, writes GraphQL queries with gql(), handles SFAPI errors,
  or wires up storefront data fetching in any framework.
---

# `@shopify/hydrogen`

Type-safe GraphQL client for Shopify's Storefront API. Works anywhere you can call `fetch`.

```ts
import { createStorefrontClient, gql } from '@shopify/hydrogen'
```

## Environment Names

Use these canonical environment variable names in app code and docs:

- `PUBLIC_STORE_DOMAIN` for the Shopify store domain.
- `PUBLIC_STOREFRONT_API_TOKEN` for the public Storefront API token.
- `PRIVATE_STOREFRONT_API_TOKEN` for the private Storefront API token.

If the framework requires a prefix to expose client-side variables, preserve the canonical suffix and add only that framework prefix. For example: `NEXT_PUBLIC_STORE_DOMAIN`, `VITE_PUBLIC_STORE_DOMAIN`, or `PUBLIC_STORE_DOMAIN` depending on the framework. Never expose `PRIVATE_STOREFRONT_API_TOKEN` to the client.

---

## Picking a client type

`createStorefrontClient({ type, config })` takes a client type and config object. Pick the type based on where the code runs and whether buyer identity is available:

| Type | Throttle bucket | Best for |
|------|-----------------|----------|
| `"public"` | Per client IP | Browser-side fetches |
| `"private"` | Per buyer IP | SSR with buyer isolation (best throughput) |
| `"private_shared_rate_limit"` | Shared across app | Prerendering, background jobs, webhooks |

### Public client

```ts
import { createStorefrontClient } from "@shopify/hydrogen";

const client = createStorefrontClient({
  type: "public",
  config: {
    storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
    publicStorefrontToken: process.env.PUBLIC_STOREFRONT_API_TOKEN!,
    i18n: { country: "US", language: "EN" },
  },
});
```

### Private client (SSR)

Requires `buyerIp` to forward buyer identity for per-buyer throttle isolation. Resolve request-derived values before creating the client:

```ts
import { createStorefrontClient, createStorefrontRequestContext } from "@shopify/hydrogen";

function getBuyerIp(request: Request) {
  const buyerIp = request.headers.get("oxygen-buyer-ip");
  if (!buyerIp) throw new Error("oxygen-buyer-ip is required for private SFAPI clients");
  return buyerIp;
}

const client = createStorefrontClient({
  type: "private",
  config: {
    storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
    privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
    buyerIp: getBuyerIp(request),
    i18n: getLocaleFromRequest(request),
    requestContext: createStorefrontRequestContext(request),
  },
});
```

Hydrogen does not infer buyer IP headers. Apps decide how to build `buyerIp` based on their deployment and trusted request data. Common provider defaults:

- Oxygen: `oxygen-buyer-ip`
- Cloudflare: `CF-Connecting-IP`
- Vercel: `x-forwarded-for`
- Fly.io: `Fly-Client-IP` (parse `X-Forwarded-For` only when another reverse proxy sits in front)

Use the same request-scoped private client for Hydrogen route handlers, redirect handlers, cart server handlers, and server data loaders. The handlers require a provided client and do not create fallback clients internally.

### Shared rate limit client

For queries not on behalf of a specific buyer (pre-rendering, static site generation). No buyer IP — all requests share one throttle bucket.

```ts
const client = createStorefrontClient({
  type: "private_shared_rate_limit",
  config: {
    storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
    privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
    i18n: { country: "US", language: "EN" },
  },
});
```

---

## Writing queries with `gql`

`gql` is a pre-configured tag with baked-in SFAPI introspection. No codegen, no graphql-config — types are inferred at the type level from the query string.

```ts
const SHOP_QUERY = gql(`query { shop { name description } }`);
```

Fragments compose via a second argument:

```ts
const PRODUCT_FIELDS = gql(`fragment ProductFields on Product { title handle }`);
const QUERY = gql(`query { products(first: 10) { nodes { ...ProductFields } } }`, [PRODUCT_FIELDS]);
```

### Editor autocompletion

For inline GraphQL autocompletion, validation, and hover docs inside `gql()` calls, add the `gql.tada/ts-plugin` to the user's `tsconfig.json` and install `gql.tada` as a devDependency:

```bash
npm install -D gql.tada
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "gql.tada/ts-plugin",
        "schema": "node_modules/@shopify/hydrogen/src/graphql/generated/storefront.schema.graphql",
        "trackFieldUsage": false
      }
    ]
  }
}
```

The editor must be configured to use the workspace TypeScript version (not the bundled one) — the bundled TS server does not load plugins.

---

## Fetching data

### Variables and i18n auto-injection

`$country` and `$language` variables are auto-injected from the client's `i18n` config when declared in the query. You only pass the variables you own:

```ts
const PRODUCTS = gql(`
  query Products($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collection(handle: $handle) { products(first: 10) { nodes { title } } }
  }
`);

const { data } = await client.graphql(PRODUCTS, {
  variables: { handle: "summer-sale" },
});
```

User-provided values take precedence over auto-injected ones.

### Where does request state go?

`requestContext` is passed at client creation so request-scoped cookies, request-group IDs, response-header capture, and request aborts are centralized. Per-call `signal` is optional when you need additional cancellation:

```ts
const { data } = await client.graphql(QUERY);
const { data } = await client.graphql(QUERY, { signal });
```

`requestContext.signal`, per-call `signal`, and the client's timeout signal are raced automatically.

---

## Error handling

**Transport errors throw. GraphQL errors are returned.** This is the key mental model:

```ts
import { StorefrontApiError, StorefrontTimeoutError } from "@shopify/hydrogen";

try {
  const { data, errors, headers } = await client.graphql(QUERY);
  if (errors) { /* partial GraphQL errors — query succeeded but some fields failed */ }
} catch (error) {
  if (error instanceof StorefrontTimeoutError) { /* timed out */ }
  if (error instanceof StorefrontApiError) { /* non-200, network failure, or JSON parse error */ }
}
```

Every successful result includes `headers` (the raw `Headers` object from the response) — useful for forwarding `Set-Cookie` headers in SSR or reading rate-limit metadata.

A 200 response with GraphQL `errors` does NOT throw — partial success is valid in GraphQL. Non-200 responses, timeouts, network failures, and JSON parse errors all throw `StorefrontApiError` (or the `StorefrontTimeoutError` subclass).

`StorefrontApiError` carries GraphQL error context (`locations`, `path`, `extensions`) when available. `extensions.code` enables programmatic branching (e.g. retry on `"THROTTLED"`). `toJSON()` strips dev-only fields (`queryText`, `variables`, `stack`) — safe for error reporters.

---

## Testing

Inject a mock `fetch` at construction — the client calls it instead of the global:

```ts
const mockFetch = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ data: { shop: { name: "Test" } } })),
);

const client = createStorefrontClient({
  type: "public",
  config: {
    storeDomain: "test.myshopify.com",
    publicStorefrontToken: "test-token",
    fetch: mockFetch,
    i18n: { country: "US", language: "EN" },
  },
});
```

---

## Gotchas

- **Private tokens throw in browser** — a `typeof document !== "undefined"` guard fires at construction.
- **Module-scope safe** — create the client once at module scope and reuse across requests.

---

## Framework recipes

Read the recipe for your framework when wiring up the client in an app:

- **Next.js App Router** — `references/nextjs.md` — Module-scoped client with synthetic `Request` from `headers()`, plus a static-page variant using `private_shared_rate_limit` that keeps pages cacheable via ISR.
- **React Router 7** — `references/react-router.md` — Middleware-provided client with trusted buyer IP headers, request-context header propagation, and context-based loader access.
- **Astro** — `references/astro.md` — Middleware sets client on `Astro.locals`, static pages use module-scoped client with `export const prerender = true`. Key footgun: `Astro.clientAddress` throws on prerendered pages.
- **SvelteKit** — `references/sveltekit.md` — Handle hook sets client on `event.locals`, load functions destructure it. Key footgun: `getClientAddress()` returns the proxy IP without `ADDRESS_HEADER` + `XFF_DEPTH` config.
- **SolidStart** — `references/solidstart.md` — Middleware sets client on `event.locals`, server functions retrieve it via `getRequestEvent()`. Key footgun: `getRequestEvent()` only works inside `"use server"` boundaries.
