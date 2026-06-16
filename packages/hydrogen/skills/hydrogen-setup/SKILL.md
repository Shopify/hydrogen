---
name: hydrogen-setup
description: >
  End-to-end Hydrogen storefront setup orchestrator. Use after the
  deterministic Hydrogen setup command has installed @shopify/hydrogen
  and copied skills into an existing app: detect the server framework, wire the
  Storefront API client, request handlers, home page, collection/search browsing,
  cart route, cart drawer, navbar, product detail page with variant form, analytics,
  and run verification.
---

# Setting Up Hydrogen

Follow these instructions in order to set up Hydrogen in an existing or new repository. Setup-specific details live in `references/`; day-to-day domain skills stay standalone.

Assume the deterministic Hydrogen setup command has already installed `@shopify/hydrogen` and copied the packaged skills into the app. Do not redo package installation or skill copying from this LLM skill.

## Inspect The App

Read `package.json` in the current directory. If it does not exist, stop and tell the user this skill must run from the app root.

## Detect The Framework

Use LLM judgment for this step. Identify whether the app has a framework that can run server code and expose request handlers, middleware, loaders, server functions, or route handlers.

Known server-capable examples include:

- `next` → Next.js App Router.
- `react-router` plus `@react-router/dev`, `@react-router/node`, or `@react-router/serve` → React Router framework mode.
- `@sveltejs/kit` → SvelteKit.
- `astro` → Astro; verify `astro.config.*` uses `output: "server"` or `output: "hybrid"` with a server adapter before installing server routes.
- `@solidjs/start` → SolidStart.
- `nuxt` → Nuxt.
- Remix / React Router v3-style server frameworks → inspect the app's current server entry, route modules, and request lifecycle before choosing the closest setup shape.

Do not hard block just because the framework is not in this list. For unfamiliar frameworks, continue when the app has a real server request lifecycle where Hydrogen can run before routing and handle 404 redirects after routing. Stop only when the app is clearly browser-only, static-only, or has no way to run server code.

## Use Standard Environment Names

Use these canonical environment variable names throughout the app:

- `PUBLIC_STORE_DOMAIN` for the Shopify store domain.
- `PUBLIC_STOREFRONT_API_TOKEN` for the public Storefront API token.
- `PRIVATE_STOREFRONT_API_TOKEN` for the private Storefront API token.
- `PUBLIC_STOREFRONT_ID` for analytics `hydrogenSubchannelId`; use `"0"` when the app does not have a storefront ID.
- `PUBLIC_CHECKOUT_DOMAIN` for app-level checkout-domain configuration such as CSP setup. Checkout buttons should use the cart's `checkoutUrl`.

If the framework requires a prefix to expose client-side variables, preserve the canonical suffix and add only the required framework prefix. For example: `NEXT_PUBLIC_STORE_DOMAIN`, `VITE_PUBLIC_STORE_DOMAIN`, or `PUBLIC_STORE_DOMAIN` depending on the framework. Never expose `PRIVATE_STOREFRONT_API_TOKEN` to the client.

## Keep Environment Access Server-Side

Never read `process.env`, `import.meta.env`, or framework environment modules from client components, browser singletons, or modules imported by client components. Environment access belongs in server-only modules, route loaders, route handlers, middleware, server functions, or the framework's server environment API.

Client code should use same-origin Hydrogen endpoints/handlers for Shopify work. If client UI genuinely needs a public value, pass that value through server-rendered props or loader data. Private tokens and server-only config must never cross that boundary.

## Use Storefront Route Conventions

Preserve the app's existing route shape when present. When there is no established convention, use the same storefront paths as the examples:

- `/` for the home page.
- `/collections` for collection listing.
- `/collections/{handle}` for collection detail.
- `/search` for search results, with the term in `q`.
- `/products/{handle}` for product detail. Use plural `products`, not `/product`.
- `/cart` for the full cart page and no-JS cart fallback.

Hydrogen-owned handlers are not page routes: `/api/cart`, `/api/{api-version}/graphql.json`, `/checkout`, cart permalinks like `/cart/{variantId}:{quantity}`, AJAX cart URLs like `/cart.js` and `/cart/add.js`, `/api/mcp`, `/agent/*`, `/graphiql` in development, `/admin` redirects, and Storefront URL redirects belong in the `hydrogen-request-handlers` wiring.

## Set Up The Storefront API Client

Use the local `hydrogen-storefront-client` skill to wire the Storefront API client or client factory for the detected framework.

When setup adds or changes Storefront API `gql()` documents, use the `hydrogen-storefront-client` GraphQL type setup and query validation guidance: install `gql.tada`, add the `gql.tada/ts-plugin` to the app `tsconfig.json`, and add/run `gql.tada check`. Framework typecheck commands do not validate `gql()` documents unless this check is chained in.

## Install API Route Handlers

Use the local `hydrogen-request-handlers` skill to wire `handleShopifyRoutes` before routing, `handleShopifyRedirects` after a 404 or in the framework's catch-all route, and request-context response-header propagation.

## Build The Home Page

Read `references/home-page.md`, then create a server-rendered home page that lists collections and products.

## Build Collection And Search Browsing

Use the local `hydrogen-collection-browser` skill when adding collection routes, search routes, filter sidebars, sort controls, active filter chips, or URL-synced product grids.

## Add The Cart Route

Use the local `hydrogen-cart-ui` skill to create the cart route at the framework's idiomatic `/cart` path.

## Install Standard Actions Runtime

Load `https://cdn.shopify.com/storefront/standard-actions.js` once in the root document before using cart drawer Standard Actions or hydrated cart integrations. Render it as a module script so its internal relative module imports resolve from the CDN URL:

```html
<script
  type="module"
  src="https://cdn.shopify.com/storefront/standard-actions.js"
  crossorigin="anonymous"
></script>
```

In JSX/TSX, use `crossOrigin="anonymous"`. If a framework script component cannot preserve `type="module"` for this URL, use a native `<script type="module">` in the root document head.

## Add The Cart Drawer

Use the local `hydrogen-cart-drawer` skill to render an accessible cart drawer once in the root layout. Keep the `/cart` route as the no-JS fallback, wire the drawer's Standard Actions `openCart` handler, and preserve the `hydrogen-cart-ui` progressive line item form contract in drawer content.

## Build The Navbar

Read `references/navbar.md`, then create or update the site's navbar/layout with a home link and a cart trigger.

## Build The Product Detail Page

Read `references/product-page.md`, then use the local `hydrogen-variant-form` skill to create a product detail route and product variants form at the framework's idiomatic product path.

## Install Storefront Analytics

Use the local `hydrogen-analytics` skill after the request handlers are in place. Read `references/analytics.md` for the full consent and setup details when needed.

## App-Owned Concerns (Out Of Hydrogen Scope)

`@shopify/hydrogen` does not ship helpers for customer accounts/login, image optimization, or SEO. Do not invent `@shopify/hydrogen` exports for these. Build them with the framework's own primitives and Storefront API data:

- **Customer accounts / login / order history** — use the app's auth and the Customer Account API; Hydrogen covers the storefront, not authenticated account flows.
- **Image optimization** — use the framework's image component (or `<img srcset>`) with Shopify CDN URL transforms; do not expect a Hydrogen `Image` component.
- **SEO** — render meta/Open Graph tags and JSON-LD `Product`/`BreadcrumbList` structured data with the framework's head/metadata API using Storefront API data.

Mention these to the user when they are relevant to the storefront being built rather than skipping them silently.

## Verification

Inspect `package.json` scripts and run the applicable commands in this order:

1. Formatting fixer when present: `format`.
2. Static checks when present: `lint`, `typecheck`, or `check`; these must include `gql.tada check` when setup added or changed Storefront API queries.
3. Build when present: `build`.
4. Tests when present: `test`.
5. Formatting check when present and distinct from `format`: `format:check`.

If Playwright is present, run it headless. Use the local `hydrogen-smoke-test` skill for runtime verification of request handlers, cart, product, collection/search, analytics, markets, money, and production-mode behavior. Run the request-handler curl checks against both dev and production builds when the framework supports both. If any command fails, fix the app and rerun the failed command.

## Stop Conditions

- No `package.json` in the current directory.
- No server-capable framework detected.
- Astro is configured for static output only and no server adapter is present.
- The user declines to overwrite a conflicting copied skill and the existing skill is too old or incompatible to continue safely.
