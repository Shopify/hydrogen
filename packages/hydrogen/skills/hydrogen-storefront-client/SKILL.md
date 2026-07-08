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
- `PUBLIC_STOREFRONT_ID` for analytics `hydrogenSubchannelId`; use `"0"` when the app does not have a storefront ID.
- `PUBLIC_CHECKOUT_DOMAIN` for app-level checkout-domain configuration such as CSP setup. Checkout links should come from cart data, usually `cart.checkoutUrl`.

If the framework requires a prefix to expose client-side variables, preserve the canonical suffix and add only that framework prefix. For example: `NEXT_PUBLIC_STORE_DOMAIN`, `VITE_PUBLIC_STORE_DOMAIN`, or `PUBLIC_STORE_DOMAIN` depending on the framework. Never expose `PRIVATE_STOREFRONT_API_TOKEN` to the client.

Environment variables are still a **server-side input boundary**. Do not read `process.env`, `import.meta.env`, or framework env modules from client components or modules imported by client components. Public-prefixed names mean a value is safe to serialize when needed; they are not permission to read env APIs in browser code. Browser UI should normally call same-origin Hydrogen endpoints/handlers. If a public value is genuinely needed in the browser, pass it from a server route/layout boundary as explicit data.

---

## Picking a client type

`createStorefrontClient({type, requestContext, config})` takes a client type, a request context, and a client config object. Pick the type based on where the code runs, which token is safe there, and whether buyer context is available:

| Type | Access | Best for |
|------|--------|----------|
| `"public"` | Public token, or tokenless | Browser-side fetches with server-provided public config |
| `"private"` | Private token with trusted `buyerIp` | SSR with buyer context |
| `"private_no_buyer_context"` | Private token without buyer context | Prerendering, background jobs, webhooks |

Token-based Storefront API access is required for product tags, metaobjects, metafields, menus, and customers. Public and private tokens can query the same token-required fields; the difference is whether the token is safe to expose and whether the request has trusted buyer context.

### Public client

This example belongs in a server-only module unless the config values are explicitly passed into browser code by a server boundary.

```ts
import { createStorefrontClient, createShopifyRequestContext } from "@shopify/hydrogen";

const requestContext = createShopifyRequestContext({
  request: { headers: new Headers() },
  i18n: { country: "US", language: "EN" },
});

const client = createStorefrontClient({
  type: "public",
  requestContext,
  config: {
    storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
    publicStorefrontToken: process.env.PUBLIC_STOREFRONT_API_TOKEN!,
  },
});
```

### Private client (SSR)

Requires `buyerIp` to forward trusted buyer context. Resolve request-derived values before creating the client:

```ts
import { createStorefrontClient, createShopifyRequestContext } from "@shopify/hydrogen";

function getBuyerIp(headers: Headers) {
  const buyerIp = headers.get("oxygen-buyer-ip");
  if (!buyerIp) throw new Error("oxygen-buyer-ip is required for private SFAPI clients");
  return buyerIp;
}

const requestContext = createShopifyRequestContext({
  request,
  i18n: getLocaleFromRequest(request),
});

const client = createStorefrontClient({
  type: "private",
  requestContext,
  config: {
    storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
    privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
    buyerIp: getBuyerIp(request.headers),
  },
});
```

Hydrogen does not infer buyer IP headers. Apps decide how to build `buyerIp` based on their deployment and trusted request data. Common provider defaults:

- Oxygen: `oxygen-buyer-ip`
- Cloudflare: `CF-Connecting-IP`
- Vercel: `x-forwarded-for`
- Fly.io: `Fly-Client-IP` (parse `X-Forwarded-For` only when another reverse proxy sits in front)

Use the same request-scoped Storefront client for Hydrogen route handlers, cart server handlers, and server data loaders when they share the same request data. Route and cart handlers accept any provided Storefront client. Redirect handlers still require a private server-side client.

### Private client without buyer context

For queries not on behalf of a specific buyer (pre-rendering, static site generation). No buyer IP is forwarded.

```ts
const requestContext = createShopifyRequestContext({
  request: { headers: new Headers() },
  i18n: { country: "US", language: "EN" },
});

const client = createStorefrontClient({
  type: "private_no_buyer_context",
  requestContext,
  config: {
    storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
    privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
  },
});
```

---

## Writing queries with `gql`

`gql` is a pre-configured tag with baked-in SFAPI introspection. No codegen, no graphql-config — types are inferred at the type level from the query string.

Customer Account API documents use `gql` from `@shopify/hydrogen/customer-account` instead. Keep the two helpers separate so Storefront API documents and Customer Account API documents cannot be mixed.

```ts
const SHOP_QUERY = gql(`query { shop { name description } }`);
```

Fragments compose via a second argument:

```ts
const PRODUCT_FIELDS = gql(`fragment ProductFields on Product { title handle }`);
const QUERY = gql(`query { products(first: 10) { nodes { ...ProductFields } } }`, [PRODUCT_FIELDS]);
```

### Predictive search fragments

When customizing predictive search, prefer Hydrogen's additive fragments instead of replacing the full query. This keeps base fields such as `trackingParameters`, handles, titles, images, and prices available to helpers and result links:

```ts
import { gql, makePredictiveSearchQueries } from "@shopify/hydrogen";

const queries = makePredictiveSearchQueries({
  fragments: {
    product: gql(`
      fragment PredictiveSearchProductFragment on Product {
        vendor
      }
    `),
  },
});
```

Use the fragments with `createPredictiveSearchServerHandlers({ fragments })`, or use the generated query with `queryPredictiveSearch()`. Read the predictive search skill when wiring autocomplete UI or result URLs.

### GraphQL type setup

When adding Storefront API `gql()` documents to a TypeScript app, install `gql.tada` as a devDependency and add the `gql.tada/ts-plugin` to the app's `tsconfig.json`:

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
        "schema": "node_modules/@shopify/hydrogen/dist/storefront.schema.json",
        "tadaOutputLocation": "./src/storefront-graphql-env.d.ts",
        "trackFieldUsage": false
      }
    ]
  }
}
```

If the app already has TypeScript plugins, append this plugin without removing framework plugins such as Next.js `name: "next"`. If the app's `tsconfig.json` extends a generated framework config, add `compilerOptions.plugins` in the extending `tsconfig.json`.

The schema path above is shipped by the `@shopify/hydrogen` package.

If the app also authors Customer Account API documents, use `@shopify/hydrogen/customer-account` and configure `gql.tada` with a separate `customer-account` schema entry. See `references/query-validation.md` for the multi-schema shape.

This plugin provides inline GraphQL autocompletion, validation, and hover docs inside `gql()` calls. The editor must be configured to use the workspace TypeScript version (not the bundled one) — the bundled TS server does not load plugins.

### Headless query validation

Read `references/query-validation.md` when adding or changing `gql()` documents. The editor plugin does not run during `tsc`; add and run `gql.tada check` so invalid Storefront API fields fail in CI instead of surfacing as runtime GraphQL errors.

---

## Fetching data

### Variables and i18n auto-injection

`$country` and `$language` variables are auto-injected from `requestContext.i18n` when declared in the query. Static clients still create a request context, usually with empty headers plus the resolved locale. You only pass the variables you own:

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

`requestContext` is passed at client creation so request-scoped cookies, request-group IDs, response-header capture, personalized-response cache safety, and request aborts are centralized. Use one Shopify request context for Storefront and Customer Account clients in the same request. Per-call `signal` is optional when you need additional cancellation:

```ts
const { data } = await client.graphql(QUERY);
const { data } = await client.graphql(QUERY, { signal });
```

`requestContext.signal`, per-call `signal`, and the client's timeout signal are raced automatically. At the final response boundary, append committed session headers first, then call `requestContext.applyResponseHeaders(response.headers)`.

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
    requestContext: createShopifyRequestContext({
      request: { headers: new Headers() },
      i18n: { country: "US", language: "EN" },
    }),
  config: {
    storeDomain: "test.myshopify.com",
    publicStorefrontToken: "test-token",
    fetch: mockFetch,
  },
});
```

---

## Gotchas

- **Private tokens throw in browser** — a `typeof document !== "undefined"` guard fires at construction.
- **Env APIs are server-only** — examples that use `process.env` belong in server-only modules. Browser bundles may leave `process.env` undefined, inline stale build-time values, or accidentally expose config. Pass safe public values through server data when browser code needs them.
- **Module-scope only for request-independent clients** — static public clients and `private_no_buyer_context` clients can be module-scoped when their `requestContext` uses static headers and static `i18n`. Private per-buyer clients and clients with a real incoming request context must be created per request.

---

## Framework recipes

Before wiring a client into an app, check whether this skill has a reference file for the app's framework in `references/`. If one exists, read it and preserve that framework's request context, server data, and buyer-IP conventions. If there is no matching reference, use the core rules above: create request-scoped private clients only inside the server request lifecycle when buyer context exists, keep static public or no-buyer-context clients module-scoped only when they do not depend on request state, and forward captured response headers where the framework allows it.
