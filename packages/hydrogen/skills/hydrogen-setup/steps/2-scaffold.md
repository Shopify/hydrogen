# Scaffold

## Use Storefront Route Conventions

Preserve the app's existing route shape when present. When there is no established convention, use the standard paths:

- `/collections` for collection listing.
- `/collections/{handle}` for collection detail.
- `/search` for search results.
- `/products/{handle}` for product detail. Use plural `products`, not `/product`.
- `/cart` for the full cart page.

Hydrogen-owned handlers are not page routes: `/api/cart`, `/api/{api-version}/graphql.json`, `/checkout`, cart permalinks like `/cart/{variantId}:{quantity}`, AJAX cart URLs like `/cart.js` and `/cart/add.js`, `/api/mcp`, `/agent/*`, `/graphiql` in development, `/admin` redirects, and Storefront URL redirects belong in the `hydrogen-request-handlers` wiring.

Invoke the `hydrogen-routing` skill and create the shared route template manifest for Shopify resources such as products, collections, pages, blogs, or articles.

### Continue when

- [ ] Route templates are set up

## Use Standard Environment Names

Use these canonical environment variable names throughout the app (kept in sync with `hydrogen-storefront-client`):

- `PUBLIC_STORE_DOMAIN` for the Shopify store domain.
- `PUBLIC_STOREFRONT_API_TOKEN` for the public Storefront API token.
- `PRIVATE_STOREFRONT_API_TOKEN` for the private Storefront API token.
- `PUBLIC_STOREFRONT_ID` for analytics `storefrontId`; use `"0"` when the app does not have a storefront ID.
- `PUBLIC_CHECKOUT_DOMAIN` for app-level checkout-domain configuration such as CSP setup. Checkout links should come from cart data, usually `cart.checkoutUrl`.
- `SHOP_ID` for the numeric Shopify shop ID string. Required by Shopify runtime scripts (`ShopifyScripts`) for every storefront, and by Customer Account API.
- `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` for Customer Account OAuth.
- `CUSTOMER_ACCOUNT_SESSION_SECRET` for encrypted cookie examples. Prefer opaque server-side sessions in production apps.

If the framework requires a prefix to expose client-side variables, preserve the canonical suffix and add only the required framework prefix. Never expose `PRIVATE_STOREFRONT_API_TOKEN` to the client.

List `PUBLIC_STOREFRONT_API_TOKEN` in the app's env example file as a commented-out entry (`# PUBLIC_STOREFRONT_API_TOKEN=`). The Storefront client accepts `undefined` as tokenless access, which is all mock.shop supports, so the scaffold works before the user has tokens and upgrades in place when they add one. Do not write an uncommented empty assignment (`PUBLIC_STOREFRONT_API_TOKEN=`): env loaders parse that as an empty string, and the client rejects empty tokens. Recommend filling it in (or switching to a private client) once the app targets a real store.

### Continue when

- [ ] Env vars follow the canonical names (plus any required framework prefix)
- [ ] `PUBLIC_STOREFRONT_API_TOKEN` is listed commented-out in the env example until the user provides a token
- [ ] `PRIVATE_STOREFRONT_API_TOKEN` is not exposed to the client

## Keep Environment Access Server-Side

Never read `process.env`, `import.meta.env`, or framework environment modules from client components, browser singletons, or modules imported by client components. Environment access belongs in server-only modules, route loaders, route handlers, middleware, server functions, or the framework's server environment API.

Prefer resolving and formatting values on the server and passing them to client UI as serialized data. Any object or property derived from env or server config — such as the `shop` object passed to `ShopifyScripts` — should be assembled in the framework's server boundary (RSC, route loaders, server functions, worker request handlers) and flow down as props or loader data, never assembled in client code.

Client code should use same-origin Hydrogen endpoints/handlers for Shopify work. Private tokens and server-only config must never cross the server boundary.

### Continue when

- [ ] No client component or browser-imported module reads `process.env`, `import.meta.env`, or framework env modules
- [ ] Values derived from env are resolved in server boundaries and reach client UI only as serialized props or loader data

## Set Up The Storefront API Client

Invoke the `hydrogen-storefront-client` skill to wire the Storefront API client or client factory for the detected framework.

### Continue when

- [ ] Storefront client is initialised with a shopify request context
- [ ] A test graphql query can be ran on the home page and returns the correct type
- [ ] `hydrogen gql check` is chained into the `typecheck` script (per the `hydrogen-storefront-client` skill) and passes


## Install API Route Handlers

Invoke the `hydrogen-request-handlers` skill to wire `handleShopifyRoutes` before routing, `handleShopifyRedirects` after a 404 or in the framework's catch-all route, and request-context response-header propagation for custom and framework responses.

### Continue when

- [ ] `/api/graphiql` returns 200 in development mode
- [ ] `/admin` redirects to the Shopify Admin in development mode

## Set Up The Customer Account API

Invoke the `hydrogen-customer-account` skill to create the `customerSession` module and register the account route handlers through the `handleShopifyRoutes` setup from the previous section.

### Continue when

- [ ] `customerSession` is created at module scope
- [ ] customer account handlers (result of calling `createCustomerAccountServerHandlers`) is registered through `handleShopifyRoutes`
- [ ] `/account/login` does not 404
- [ ] `hydrogen gql check` passes when any page renders Customer Account API data
