---
name: hydrogen-setup
description: >
  End-to-end Hydrogen storefront setup orchestrator. Use after the
  deterministic Hydrogen setup command has installed @shopify/hydrogen
  and copied skills into an existing app: detect the server framework, wire the
  Storefront API client, request interceptors, home page, navbar, cart route,
  analytics, and run verification.
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

## Set Up The Storefront API Client

Use the local `hydrogen-storefront-client` skill to create the shared Storefront API client for the detected framework.

## Install API Route Handlers

Read `references/request-handlers.md`, then wire `handleShopifyRoutes` before routing and `handleShopifyRedirects` after a 404 or in the framework's catch-all route.

## Build The Home Page

Read `references/home-page.md`, then create a server-rendered home page that lists collections and products.

## Build The Navbar

Read `references/navbar.md`, then create or update the site's navbar/layout with a home link and a cart link.

## Add The Cart Route

Use the local `hydrogen-cart-ui` skill to create the cart route at the framework's idiomatic `/cart` path.

## Install Storefront Analytics

Read `references/analytics.md`, then install analytics after the request interceptors are in place.

## Verification

Inspect `package.json` scripts and run the applicable commands in this order:

1. Formatting fixer when present: `format`.
2. Static checks when present: `lint`, `typecheck`, or `check`.
3. Build when present: `build`.
4. Tests when present: `test`.
5. Formatting check when present and distinct from `format`: `format:check`.

If Playwright is present, run it headless. If any command fails, fix the app and rerun the failed command.

## Stop Conditions

- No `package.json` in the current directory.
- No server-capable framework detected.
- Astro is configured for static output only and no server adapter is present.
- The user declines to overwrite a conflicting copied skill and the existing skill is too old or incompatible to continue safely.
