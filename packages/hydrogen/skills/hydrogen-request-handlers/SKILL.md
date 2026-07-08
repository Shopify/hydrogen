---
name: hydrogen-request-handlers
description: >
  Guide for wiring Hydrogen request interceptors in server frameworks. Use when
  adding, modifying, or reviewing handleShopifyRoutes, handleShopifyRedirects,
  SFAPI proxy routes, cart, predictive search, and Customer Account server handlers,
  checkout redirects, cart permalinks, AJAX cart proxy routes, /admin redirects, Storefront URL redirects,
  requestContext response-header propagation, or framework middleware,
  not-found, and catch-all integration.
---

# Hydrogen Request Handlers

Hydrogen request handlers are framework-neutral, but the framework wiring is not. Always choose the reference for the host framework and preserve its routing gate.

## Framework References

Before wiring middleware or route handlers, check whether this skill has a reference file for the app's framework in `references/`. If one exists, read it and preserve that framework's routing gate. If there is no matching reference, use `references/frameworks.md` as the generic adaptation guide and map its pre-routing and post-404 phases onto the app's server lifecycle.

## Core Gate

```
Request
  -> handleShopifyRoutes() before framework routing
  -> framework router
  -> handleShopifyRedirects() only after a 404
  -> framework 404 page
```

`handleShopifyRoutes` owns Hydrogen routes the framework should never see: SFAPI proxy URLs, `/checkout`, cart permalinks like `/cart/{variantId}:{quantity}`, AJAX cart URLs like `/cart.js` and `/cart/add.js`, `/api/mcp`, `/agent/*`, `/graphiql` in development, and app-registered handler groups such as `createCartServerHandlers()` or `createCustomerAccountServerHandlers()`.

`handleShopifyRedirects` is a post-routing 404 check for `/admin`, configured standard route redirects, Storefront URL redirects, and same-origin query-param redirects. Do not run it on every request.

## Standard Route Redirects

Use the local `hydrogen-routing` skill to create the shared `routeTemplates` manifest. This request-handler skill only wires that object into `handleShopifyRedirects` after the app router returns a 404.

```ts
const redirect = await handleShopifyRedirects({
  request,
  storefrontClient,
  routeTemplates,
});
```

## Rules

- Default to one request-scoped private Storefront client per request when buyer context exists.
- Route handlers and cart server handlers accept any provided Storefront client when public or no-buyer-context access is intentional.
- Resolve trusted `buyerIp` before creating a private client; use the `hydrogen-storefront-client` buyer-IP guidance for the app's deployment.
- Create `requestContext` with `createShopifyRequestContext({ request, i18n })` where the framework exposes a real `Request`; use `request: { headers }` only when no `Request` exists.
- Pass the same request-scoped `requestContext`, `storefrontClient`, and `sessionManager` into `handleShopifyRoutes` and registered handler groups.
- Pass `request` and `storefrontClient` into `handleShopifyRedirects`; it does not receive a session manager.
- Pass registered handler groups explicitly, for example `handlers: [cartHandlers, customerAccountHandlers]`.
- `handleShopifyRoutes` applies request-context response headers before returning matched Hydrogen route responses.
- For framework-routed responses, commit session headers once at the final response boundary, append those headers, then call `requestContext.applyResponseHeaders(response.headers)` so SFAPI cookies, `Server-Timing`, tracking fallback headers, and personalized-response cache safety survive.
- Wire this in production runtime code, not dev-only hooks. Only GraphiQL is dev-only.

## Imports

Use public package exports:

```ts
import {
  createCartServerHandlers,
  createPredictiveSearchServerHandlers,
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { createCustomerAccountServerHandlers } from "@shopify/hydrogen/customer-account";
```

## Verify

Run the app in dev and production modes, then check:

1. `POST /api/<api-version>/graphql.json` returns Storefront API JSON, not the app 404.
2. `GET /api/cart` returns cart handler JSON when cart handlers are registered. With no cart id, the body is `{cart: null}` and no Storefront API cart lookup is made.
3. `GET /api/predictive-search?q=snow` returns predictive search JSON when predictive search handlers are registered.
4. `GET /account/login`, `GET /account/authorize`, `GET /account/refresh`, and `POST /account/logout` are handled before the app router when Customer Account handlers are registered.
5. `GET /admin` returns a redirect to the shop admin URL.
6. An unknown path returns the framework 404 when no Shopify redirect exists.
7. Cart, predictive search, Customer Account, and SFAPI responses preserve `Set-Cookie` and `Server-Timing` headers where the framework exposes them.
8. Authenticated Customer Account responses do not preserve public or CDN cache-control headers.
