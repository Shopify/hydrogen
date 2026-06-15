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

If the framework requires a prefix to expose client-side variables, preserve the canonical suffix and add only the required framework prefix. For example: `NEXT_PUBLIC_STORE_DOMAIN`, `VITE_PUBLIC_STORE_DOMAIN`, or `PUBLIC_STORE_DOMAIN` depending on the framework. Never expose `PRIVATE_STOREFRONT_API_TOKEN` to the client.

## Keep Environment Access Server-Side

Never read `process.env`, `import.meta.env`, or framework environment modules from client components, browser singletons, or modules imported by client components. Environment access belongs in server-only modules, route loaders, route handlers, middleware, server functions, or the framework's server environment API.

Client code should use same-origin Hydrogen endpoints/handlers for Shopify work. If client UI genuinely needs a public value, pass that value through server-rendered props or loader data. Private tokens and server-only config must never cross that boundary.

## Set Up The Storefront API Client

Use the local `hydrogen-storefront-client` skill to wire the Storefront API client or client factory for the detected framework.

When setup adds or changes Storefront API `gql()` documents, use the `hydrogen-storefront-client` query validation reference to add and run a headless GraphQL validation check.

## Install API Route Handlers

Use the local `hydrogen-request-handlers` skill to wire `handleShopifyRoutes` before routing, `handleShopifyRedirects` after a 404 or in the framework's catch-all route, and request-context response-header propagation.

## Build The Home Page

Read `references/home-page.md`, then create a server-rendered home page that lists collections and products.

## Build Collection And Search Browsing

Use the local `hydrogen-collection-browser` skill when adding collection routes, search routes, filter sidebars, sort controls, active filter chips, or URL-synced product grids.

## Add The Cart Route

Use the local `hydrogen-cart-ui` skill to create the cart route at the framework's idiomatic `/cart` path.

## Install Standard Actions Runtime

Load `https://cdn.shopify.com/storefront/standard-actions.js` once in the root document before using cart drawer Standard Actions or hydrated cart integrations. Use the framework's script primitive when it has one, such as Next.js `Script` with `strategy="beforeInteractive"`; otherwise render a module script in the root document head.

## Add The Cart Drawer

Use the local `hydrogen-cart-drawer` skill to render an accessible cart drawer once in the root layout. Keep the `/cart` route as the no-JS fallback, wire the drawer's Standard Actions `openCart` handler, and preserve the `hydrogen-cart-ui` progressive line item form contract in drawer content.

## Build The Navbar

Read `references/navbar.md`, then create or update the site's navbar/layout with a home link and a cart trigger.

## Build The Product Detail Page

Read `references/product-page.md`, then use the local `hydrogen-variant-form` skill to create a product detail route and product variants form at the framework's idiomatic product path.

## Install Storefront Analytics

Use the local `hydrogen-analytics` skill after the request handlers are in place. Read `references/analytics.md` for the full consent and setup details when needed.

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
