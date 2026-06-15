---
name: hydrogen-request-handlers
description: >
  Guide for wiring Hydrogen request interceptors in server frameworks. Use when
  adding, modifying, or reviewing handleShopifyRoutes, handleShopifyRedirects,
  SFAPI proxy routes, cart server handlers, checkout redirects, cart permalinks,
  AJAX cart proxy routes, /admin redirects, Storefront URL redirects,
  requestContext response-header propagation, or framework middleware,
  not-found, and catch-all integration.
---

# Hydrogen Request Handlers

Hydrogen request handlers are framework-neutral, but the framework wiring is not. Always choose the reference for the host framework and preserve its routing gate.

Read the matching reference:

- React Router, SvelteKit, Astro, SolidStart, or generic framework adaptation: `references/frameworks.md`.
- Next.js App Router: `references/nextjs.md`.
- Nuxt/Nitro: `references/nuxt.md`.

## Core Gate

```
Request
  -> handleShopifyRoutes() before framework routing
  -> framework router
  -> handleShopifyRedirects() only after a 404
  -> framework 404 page
```

`handleShopifyRoutes` owns Hydrogen routes the framework should never see: SFAPI proxy URLs, `/checkout`, cart permalinks like `/cart/{variantId}:{quantity}`, AJAX cart URLs like `/cart.js` and `/cart/add.js`, `/api/mcp`, `/agent/*`, `/graphiql` in development, and app-registered handlers such as `createCartServerHandlers()`.

`handleShopifyRedirects` is a post-routing 404 check for `/admin`, Storefront URL redirects, and same-origin query-param redirects. Do not run it on every request.

## Rules

- Create one request-scoped private Storefront client per request.
- Resolve trusted `buyerIp` before creating the private client; use the `hydrogen-storefront-client` buyer-IP guidance for the app's deployment.
- Create `requestContext` with `createStorefrontRequestContext(request)` where the framework exposes a real `Request`; use `{ headers }` only when no `Request` exists.
- Pass the same `storefrontClient` into `handleShopifyRoutes`, `handleShopifyRedirects`, `cartHandlers`, and server data loaders.
- Pass cart handlers explicitly: `handlers: [cartHandlers]`.
- Call `requestContext.applyResponseHeaders(response.headers)` before returning the final framework response so SFAPI cookies, `Server-Timing`, and tracking fallback headers survive.
- Wire this in production runtime code, not dev-only hooks. Only GraphiQL is dev-only.

## Imports

Use public package exports:

```ts
import {
  createCartServerHandlers,
  createStorefrontClient,
  createStorefrontRequestContext,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
```

## Verify

Run the app in dev and production modes, then check:

1. `POST /api/<api-version>/graphql.json` returns Storefront API JSON, not the app 404.
2. `GET /api/cart` returns cart JSON when cart handlers are registered.
3. `GET /admin` returns a redirect to the shop admin URL.
4. An unknown path returns the framework 404 when no Shopify redirect exists.
5. Cart and SFAPI responses preserve `Set-Cookie` and `Server-Timing` headers where the framework exposes them.
