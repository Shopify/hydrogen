---
name: hydrogen-setup
description: >
  End-to-end Hydrogen storefront setup orchestrator. Use after the
  deterministic Hydrogen setup command has installed @shopify/hydrogen
  and copied skills into an existing app: detect the server framework, wire the
  Storefront API client, request handlers, Customer Account API, home page,
  collection/search browsing, cart route, cart drawer, navbar, product detail page
  with variant form, analytics, and run verification.
---

# Setting Up Hydrogen

Follow these instructions in order to set up Hydrogen in an existing or new repository. Setup-specific details live in `references/`; day-to-day domain skills stay standalone.

Assume the deterministic Hydrogen setup command has already installed `@shopify/hydrogen` and copied the packaged skills into the app. Do not redo package installation or skill copying from this LLM skill.

## Inspect The App

Read `package.json` in the current directory. If it does not exist, stop and tell the user this skill must run from the app root.

## Detect The Framework

Use LLM judgment for this step. Inspect dependencies, configuration files, server entry points, route directories, and existing request lifecycle code. Identify whether the app has a framework that can run server code and expose request handlers, middleware, loaders, server functions, or route handlers.

After detecting the framework, check `references/` for a matching framework reference file. Normalize likely framework or binding names to lowercase kebab-case and read the matching file before making framework-specific setup choices. If no matching reference exists, continue from the generic instructions here and follow the app's existing conventions.

Do not hard block just because no reference file exists. Continue when the app has a real server request lifecycle where Hydrogen can run before routing and handle 404 redirects after routing. Stop only when the app is clearly browser-only, static-only, or has no way to run server code.

## Use Standard Environment Names

Use these canonical environment variable names throughout the app:

- `PUBLIC_STORE_DOMAIN` for the Shopify store domain.
- `PUBLIC_STOREFRONT_API_TOKEN` for the public Storefront API token.
- `PRIVATE_STOREFRONT_API_TOKEN` for the private Storefront API token.
- `PUBLIC_STOREFRONT_ID` for analytics `hydrogenSubchannelId`; use `"0"` when the app does not have a storefront ID.
- `PUBLIC_CHECKOUT_DOMAIN` for app-level checkout-domain configuration such as CSP setup. Checkout buttons should use the cart's `checkoutUrl`.
- `SHOP_ID` for the numeric Shopify shop ID string used by Customer Account API.
- `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` for Customer Account OAuth.
- `CUSTOMER_ACCOUNT_SESSION_SECRET` for encrypted cookie examples. Prefer opaque server-side sessions in production apps.

If the framework requires a prefix to expose client-side variables, preserve the canonical suffix and add only the required framework prefix. Never expose `PRIVATE_STOREFRONT_API_TOKEN` to the client.

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

Use the local `hydrogen-routing` skill to create the shared route template manifest for Shopify resources such as products, collections, pages, blogs, or articles.

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

## Install Shopify Runtime Scripts

Render Shopify runtime scripts once in the root document. Use the `ShopifyScripts` component from your framework binding if it exports one. Frameworks without a binding should render `getShopifyScriptTags()` / `renderShopifyScriptTags()` during SSR and call `initializeShopifyScripts()` during browser hydration. Pass the resolved market as the `i18n` prop or option, use the local `hydrogen-routing` skill for the required script routing options, and pass `{shopId: env.SHOP_ID, storefrontId: env.PUBLIC_STOREFRONT_ID ?? "0"}` as `shop` when loading PerfKit. Framework bindings that support `ShopifyScripts` load WebMCP by default in browsers that expose model context.

For vanilla browser code that does not use SSR or a framework head API, render the HTML from core and include it in the document shell. If your app renders tags through core helpers instead of a framework binding, call `initializeShopifyScripts()` from bundled client code:

```ts
import { initializeShopifyScripts, renderShopifyScriptTags } from "@shopify/hydrogen";
import { routeTemplates } from "./route-templates";

const tags = renderShopifyScriptTags({ i18n, shop });
initializeShopifyScripts({ routes: routeTemplates });
```

## Configure Shopify Navigation

When Shopify or Hydrogen browser utilities need to navigate through the framework router, set the top-level navigation hook. WebMCP is one consumer of this hook. Pass `navigate={navigate}` to the framework `ShopifyScripts` component when the router hook is available there, or call `initializeShopifyScripts()` from client code when scripts are rendered through core helpers or a framework head API:

```ts
import { initializeShopifyScripts } from "@shopify/hydrogen";
import { routeTemplates } from "./route-templates";

initializeShopifyScripts({ routes: routeTemplates, navigate: (url) => router.push(url) });
```

Use the framework's normal client lifecycle primitive when the app is already bundling frontend code, such as a mounted hook, client-only effect, or processed browser script.

## Add The Cart Drawer

Use the local `hydrogen-cart-drawer` skill to render an accessible cart drawer once in the root layout. Keep the `/cart` route as the no-JS fallback, wire the drawer's Standard Actions `openCart` handler, and preserve the `hydrogen-cart-ui` progressive line item form contract in drawer content.

## Build The Navbar

Read `references/navbar.md`, then create or update the site's navbar/layout with a home link and a cart trigger.

## Build The Product Detail Page

Read `references/product-page.md`, then use the local `hydrogen-variant-form` skill to create a product detail route and product variants form at the framework's idiomatic product path.

## Install Storefront Analytics

Use the local `hydrogen-analytics` skill after the request handlers are in place. Read `references/analytics.md` for the full consent and setup details when needed.

## Set Up Customer Accounts

When the user asks for login, account profile, order history, or account-gated UI, read `references/customer-account.md`.

## App-Owned Concerns (Out Of Hydrogen Scope)

`@shopify/hydrogen` ships typed Customer Account API queries and low-level Customer Account OAuth/session helpers, but apps still own framework cookie/session adapters, account UI, image optimization, and SEO. Do not invent package exports beyond the documented APIs. Build app-owned concerns with the framework's own primitives and Shopify API data:

- **Customer accounts / login / order history** — follow `references/customer-account.md`. Keep account tokens server-side or in encrypted HttpOnly cookies, and do not retry account mutations after a timeout unless the operation is externally idempotent.
- **Image optimization** — use the framework's image component (or `<img srcset>`) with Shopify CDN URL transforms; do not expect a Hydrogen `Image` component.
- **SEO** — render meta/Open Graph tags and JSON-LD `Product`/`BreadcrumbList` structured data with the framework's head/metadata API using Storefront API data.

Mention these to the user when they are relevant to the storefront being built rather than skipping them silently.

## Verification

Inspect `package.json` scripts and run the applicable commands in this order:

1. Formatting fixer when present: `format`.
2. Static checks when present: `lint`, `typecheck`, or `check`; these must include `gql.tada check` when setup added or changed Storefront API or Customer Account API queries.
3. Build when present: `build`.
4. Tests when present: `test`.
5. Formatting check when present and distinct from `format`: `format:check`.

If Playwright is present, run it headless. Use the local `hydrogen-smoke-test` skill for runtime verification of request handlers, cart, product, collection/search, analytics, markets, money, and production-mode behavior. Run the request-handler curl checks against both dev and production builds when the framework supports both. If any command fails, fix the app and rerun the failed command.

## Stop Conditions

- No `package.json` in the current directory.
- No server-capable framework detected.
- The detected framework is configured for static output only and no server adapter or equivalent request lifecycle is present.
- The user declines to overwrite a conflicting copied skill and the existing skill is too old or incompatible to continue safely.
