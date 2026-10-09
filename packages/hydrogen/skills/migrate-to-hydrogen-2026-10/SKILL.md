---
name: migrate-to-hydrogen-2026-10
description: >
  Migrate a classic Hydrogen storefront (Remix or React Router 7) to Hydrogen
  2026-10 (`@shopify/hydrogen@^2026.10.0`), where Hydrogen is a server-handler
  library you compose instead of a framework that owns the request. Use when
  the user asks to migrate or upgrade a Hydrogen storefront to Hydrogen 2026-10
  ("migrate to hydrogen 2026-10", "migrate to hydrogen preview", "upgrade
  Hydrogen to the new library").
---

# Migrate to Hydrogen 2026-10

Migrate a classic-Hydrogen storefront (Remix- or React-Router-based) to Hydrogen 2026-10 — the release where Hydrogen becomes a server-handler library. Install `@shopify/hydrogen@^2026.10.0` (`npm view @shopify/hydrogen dist-tags` shows the current `latest`; do not install the `preview` dist-tag, which is older than `latest`). This skill is storefront-agnostic — it captures the migration shape and, most importantly, the **traps that agents get wrong**.

## The mental model (get this right first)

1. **Hydrogen 2026-10 is a server-handler library, not a framework.** (A `@shopify/hydrogen` version **before `2026.10` is still the old framework**, not the library — the classic line runs through `2026.4.x` — so an installed version below `2026.10` means the store hasn't been migrated yet, regardless of its React Router status.) You compose the request lifecycle yourself: `createShopifyRequestContext({request, i18n, buyerIp})` → `createStorefrontClient({type: 'private', requestContext, config})` (config carries `storeDomain`, `privateStorefrontToken`, `storefrontId`, `cache`, `waitUntil`; a store without a private token uses `type: 'public'` instead — see the `hydrogen-storefront-client` packaged skill for the choice) → `handleShopifyRoutes({request, requestContext, sessionManager, storefrontClient, routeTemplates, handlers})` (returns a `Promise<Response>` for handler-owned paths, else `null` — decided synchronously, so truthy-check it without `await`) → `handleShopifyRedirects` on 404 → handler groups for the rest: `createCartServerHandlers()` for cart and `createCustomerAccountServerHandlers(…)` (from `@shopify/hydrogen/customer-account`) for auth, both registered through the `handlers` array. Hydrogen no longer owns routing or the entry — you wire these into your React Router server/middleware.

2. **Dev and build are plain Vite/React Router — the classic `shopify hydrogen dev|build` commands and the `hydrogen()` Vite plugin are gone.** `dev` is `vite dev` with the `oxygen()` plugin from `@shopify/mini-oxygen/vite` (workerd runtime, `.env` injection); `build` is `react-router build`; `preview` is `vite preview` after a build. The `hydrogen` bin that ships with the library covers the rest: `hydrogen setup`, `hydrogen skills check|sync`, `hydrogen gql check`, `npx hydrogen certs install|uninstall` for local HTTPS. `@shopify/cli` stays a devDependency for the `shopify hydrogen` commands the library does not replace: `deploy`, `link`, `env pull`. Do **not** add `@shopify/hydrogen-classic` or any aliased classic package — the 2026-10 library has no classic sibling.

Before wiring any subsystem, read the matching packaged skill in `node_modules/@shopify/hydrogen/skills/` (`hydrogen-setup`, `hydrogen-request-handlers`, `hydrogen-routing`, `hydrogen-storefront-client`, `hydrogen-cart-ui`, `hydrogen-cart-drawer`, `hydrogen-collection-browser`, `hydrogen-variant-form`, `hydrogen-predictive-search`, `hydrogen-customer-account`, `hydrogen-analytics`, `hydrogen-markets`, `hydrogen-shop-pay`, …). They are the authoritative, version-correct reference — prefer them over memory.

## Migration outline

**First, determine whether the Remix→React Router move is already done.** The Remix→React Router migration and the Hydrogen-framework→Hydrogen-library migration are **independent axes**. The classic Hydrogen framework runs on **either** Remix or React Router 7, so a store can already be on React Router while still being unmigrated. Check `package.json` and imports: if there are no `@remix-run/react`, `@remix-run/node`, `@remix-run/server-runtime` or `@shopify/remix-oxygen` deps or imports and `react-router` + `@react-router/*` are present (with a `react-router.config.ts`), the RR migration is already complete (`@remix-run/cookie` and `@remix-run/session` are standalone packages the 2026-10 template itself uses for cookie sessions — not a Remix tell) — **skip the Remix swaps (steps 1 and 6 below) and do only the framework→library conversion.** "Already on React Router" does **not** mean "already migrated." The tell for the Hydrogen axis is the package: a `@shopify/hydrogen` calendar version **before `2026.10` is still classic (framework) Hydrogen** — not yet migrated (the latest classic releases are on the `2026.4.x` line).

Do these in order; verify each against the installed package rather than assuming. Copy this checklist and track progress as you go:

```
Hydrogen migration:
- [ ] Determine if already on React Router (if so, skip the Remix swaps in steps 1 and 6)
- [ ] 1. Dependencies + version pins (@shopify/hydrogen ^2026.10.0 and the seed below; drop classic-era deps)
- [ ] 2. Scripts: hydrogen skills check --mode=warn && vite dev / react-router build / vite preview; deploy via @shopify/cli
- [ ] 3. vite.config plugins: [localHttps({enabled}), ...oxygen(), reactRouter()]
- [ ] 4. react-router.config.ts added (v8_middleware on, buildDirectory 'dist')
- [ ] 5. Request wiring (request context + storefront client + route templates + session manager)
- [ ] 6. Route filename + import + json()/defer() sweep
- [ ] 7. Connect a store — env vars in .env, or MOCK_SHOP=1 for the tokenless mock.shop demo
- [ ] Optional subsystems: detect each → migrate or skip, and report every skip
- [ ] 8. Verify (build/typecheck gate, then hydrogen-smoke-test), then hand off to the user
```

1. **Dependencies** — *(Remix swap only if not already on React Router)* replace `@remix-run/react`, `@remix-run/node`, `@remix-run/server-runtime`, `@remix-run/dev` and `@shopify/remix-oxygen` with `react-router` + `@react-router/dev` (pin all React Router packages to one version; `react-router-dom` is not needed). Add `@shopify/hydrogen`, `@shopify/mini-oxygen`, `vite`, the `@types/*` packages and `@shopify/cli` at the versions in the seed below. Remove `@shopify/cli-hydrogen` and any `@shopify/hydrogen-classic`-style alias if present. Align versions to the seed rather than picking latest of each independently, and never pin React Router below the version the app already runs.
2. **Scripts** — `dev`: `hydrogen skills check --mode=warn && vite dev` (the prefix prints the resync command after a later `@shopify/hydrogen` bump without blocking dev; plain `hydrogen skills check` belongs in CI); `build`: `react-router build`; `preview`: `react-router build && vite preview`; `deploy`: `shopify hydrogen deploy --assets-dir dist/client --worker-dir dist/server`. Add `dev:https` with the **same** command — the vite.config computes the `localHttps` `enabled` flag from `npm_lifecycle_event` (step 3), not the script body.
3. **`vite.config`** — plugins are `[localHttps({enabled}), ...oxygen(), reactRouter()]`, with `localHttps` from `@shopify/hydrogen/vite` and `oxygen` from `@shopify/mini-oxygen/vite` (it returns an **array** — spread it). `localHttps` takes a **required** `enabled: boolean` — it does not self-detect; compute it in the config: `const enabled = process.env.npm_lifecycle_event === 'dev:https'`. There is no `hydrogen()` plugin anymore. You do **not** pass an oxygen `entry` — it picks up the React Router server build.
4. **`react-router.config.ts`** — add it (React Router framework config + future flags; `v8_middleware: true` is required for the middleware skeleton below). Set `buildDirectory: 'dist'` — React Router defaults to `build/`, and the deploy script's `--assets-dir dist/client --worker-dir dist/server` flags silently point at nothing without it. Explicit `routes.ts` route config and flat routes via `@react-router/fs-routes` both work — for a migration, fs-routes preserves the existing flat route filenames with the least churn.
5. **Request wiring** — in your server entry or a root middleware, build the request context and clients (mental-model step 1) and expose the storefront client to loaders via typed React Router contexts. If you already thread Oxygen `env`/`executionContext` through a context provider, keep it — the library does not force a specific context shape.
6. **Routes & imports** — *(skip the import swap if already on React Router)* swap `@remix-run/*` imports to `react-router`; migrate `json()`/`defer()` loader/action return helpers.
7. **Connect a store** — set `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_ID` and `PRIVATE_STOREFRONT_API_TOKEN` in `.env` (on Oxygen, a linked storefront injects them); customer accounts add `SHOP_ID`, `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` and `SESSION_SECRET` (full list in `references/dependencies-and-tooling.md`). With no token, or with `MOCK_SHOP=1`, the skeleton's client factory falls back to the tokenless mock.shop demo store — useful to verify the migration before the user supplies credentials. mock.shop only accepts a **tokenless public client** (it rejects the private-token header with a 401), and it is a catalog of fictional stores: https://mock.shop/llms.txt lists them.
8. **Verify** — build/typecheck gate, then the `hydrogen-smoke-test` skill, then hand off to the user (see Verification).

The exact config, version pins, and handler signatures change between builds — read them from the installed package (`node_modules/@shopify/hydrogen`, its `skills/`, and its `.d.ts`), not from this doc. The two things that are **not in the installed package** — the version seed and the React Router wiring skeleton — are below.

## Bootstrapping versions

Step 1 has a chicken-and-egg problem: you cannot "read pins from the installed package" before anything is installed. The version *identities* are a bootstrap input, distinct from the config *shapes* you read post-install. Pin by these coupling rules, not by "latest of each":

- **One React Router version** across `react-router`, `@react-router/dev` (and `@react-router/fs-routes` if you use it).
- **Floors with a reason** — `@shopify/mini-oxygen` ≥ `4.2.0` (`vite preview`) and `@shopify/cli` ≥ `4.4.0` (deploy flags); `references/dependencies-and-tooling.md` explains both. The seed already satisfies them.
- Majors that move together: `vite@^8`, `react`/`react-dom@^19`, node `^22.12 || ^24` (Vite 8's own engine floor for Node 22 is `22.12.0` — a bare `22.x` below that installs but fails Vite's engine check).
- **Align to the seed, not to "latest of each".** Newer majors of the seed's packages can exist on npm (React Router 8 does) while the library's own template still pins the seed line — a solo bump breaks the coupling rules above. The one exception: never pin React Router *below* what the app already runs.

Known-good seed, copied from the 2026-10 release's own React Router template — **verify against the current published build and update this block in place when it moves**:

```jsonc
// package.json — align to a known-good release set (the 2026-10 template)
"@shopify/hydrogen":  "^2026.10.0",
"react" | "react-dom": "^19.2.7",  "react-router": "7.15.1",  "isbot": "^5.1.36",
// devDependencies:
"@react-router/dev":  "7.15.1",     // same version as react-router; never below the app's current one
"@shopify/cli":       "4.8.1",
"@shopify/mini-oxygen": "4.2.3",
"@shopify/oxygen-workers-types": "^4.1.6",
"@types/node": "^22",  "@types/react": "^19.2.14",  "@types/react-dom": "^19.2.3",
"gql.tada": "^1.9.2",  "graphql": "^16.13.2",  "typescript": "^5.9.3",  "vite": "^8.0.3",
"engines.node": "^22.12 || ^24"     // Vite 8 requires >=22.12 on the 22 line
// scripts:
"dev":        "hydrogen skills check --mode=warn && vite dev",
"dev:https":  "hydrogen skills check --mode=warn && vite dev",   // same command — vite.config computes localHttps `enabled` from npm_lifecycle_event
"build":      "react-router build",
"preview":    "react-router build && vite preview",
"deploy":     "shopify hydrogen deploy --assets-dir dist/client --worker-dir dist/server",
"typecheck":  "react-router typegen && tsc && hydrogen gql check --fail-on-warn"
```

## Reference wiring (skeleton)

The framework→library conversion is mostly **one context file plus one middleware**. A store won't have a prior migration to copy from, so the durable *shape* is below — but verify every signature against the installed `.d.ts`, since they drift between builds.

`server.ts` shrinks to a bare fetch handler that only threads the Oxygen bindings (the template wraps this in a try/catch and adds a GET-body guard and a double-slash redirect):

```ts
import {createRequestHandler, RouterContextProvider} from 'react-router';
import * as serverBuild from 'virtual:react-router/server-build';
import {envContext} from '~/lib/storefront';

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
    const routerContext = new RouterContextProvider();
    routerContext.cache = await caches.open('hydrogen-v1');     // Oxygen Cache API → storefront client cache
    routerContext.set(envContext, env);
    routerContext.env = env;
    routerContext.waitUntil = executionContext.waitUntil.bind(executionContext);
    const handleRequest = createRequestHandler(serverBuild, process.env.NODE_ENV);
    return handleRequest(request, routerContext as never);
  },
};
```

`env.d.ts` — `routerContext.cache`/`waitUntil` above and `context.cache`/`waitUntil` in the middleware below only typecheck with this React Router module augmentation. It is app code, not something you can read from the package's `.d.ts`:

```ts
/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
import type {CacheInstance} from '@shopify/hydrogen';

declare global {
  interface Env {                                            // the Oxygen bindings (`.env` locally)
    MOCK_SHOP?: string;
    PUBLIC_STORE_DOMAIN?: string;
    PUBLIC_STOREFRONT_ID?: string;
    PRIVATE_STOREFRONT_API_TOKEN?: string;
  }
}

type HydrogenRouterContext = {cache: CacheInstance; env: Env; waitUntil: ExecutionContext['waitUntil']};

declare module 'react-router' {
  interface AppLoadContext extends HydrogenRouterContext {}
  interface RouterContextProvider extends HydrogenRouterContext {}
}
```

`app/lib/storefront.ts` — typed RR contexts plus a per-request client factory (replaces the old `AppLoadContext`). `buyerIp` goes on the **request context**; `cache`/`waitUntil`/`storefrontId` go in the **client config**. The factory returns the tokenless **public** client for mock.shop and the **private** client for a real store:

```ts
import {createContext} from 'react-router';
import {
  type CacheInstance,
  createShopifyRequestContext,
  createStorefrontClient,
  type PublicStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
  type ShopifyRequestContext,
} from '@shopify/hydrogen';

// mock.shop is auth-free and 401s any private token, so it gets the public client.
export type RequestStorefrontClient = RequestScopedPrivateStorefrontClient | PublicStorefrontClient;

export const envContext = createContext<Env>();
export const storefrontClientContext = createContext<RequestStorefrontClient>();
export const storefrontRequestContext = createContext<ShopifyRequestContext>();

// getBuyerIp is NOT a library export — it is app code (the template ships it in app/lib/shop.ts)
function getBuyerIp(headers: Headers) {
  for (const header of ['oxygen-buyer-ip', 'cf-connecting-ip', 'x-forwarded-for']) {
    const ip = headers.get(header)?.split(',')[0]?.trim();
    if (ip) return ip;
  }
  if (process.env.NODE_ENV !== 'production') return '127.0.0.1';
  throw new Error('No buyer IP header on the request');
}

export function createRequestStorefrontClient(
  request: Request,
  env: Env,
  cache: CacheInstance,
  waitUntil: ExecutionContext['waitUntil'],
): RequestStorefrontClient {
  const i18n = {country: 'US', language: 'EN'} as const;             // or derive from the URL/domain

  if (env.MOCK_SHOP === '1' || !env.PRIVATE_STOREFRONT_API_TOKEN || !env.PUBLIC_STORE_DOMAIN) {
    return createStorefrontClient({
      type: 'public',
      requestContext: createShopifyRequestContext({request, i18n}),
      config: {storeDomain: 'mock.shop', cache, waitUntil},
    });
  }

  return createStorefrontClient({
    type: 'private',
    requestContext: createShopifyRequestContext({request, i18n, buyerIp: getBuyerIp(request.headers)}),
    config: {
      storeDomain: env.PUBLIC_STORE_DOMAIN,
      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
      storefrontId: env.PUBLIC_STOREFRONT_ID,
      cache,
      waitUntil,
    },
  });
}
```

`app/lib/route-templates.ts` — maps Shopify entities to your route shapes. Pass it to `handleShopifyRoutes` (optional in the type, but handler-owned URLs come out wrong without it), to `handleShopifyRedirects` (**required** there), and to the `routes` prop of `ShopifyScripts`:

```ts
import {createShopifyRouteTemplates} from '@shopify/hydrogen';
export const routeTemplates = createShopifyRouteTemplates({
  productInCollection: '/products/:productHandle',
});
```

Root **middleware** in `app/root.tsx` (needs `future.v8_middleware`) — the request lifecycle from mental-model step 1:

```ts
import {handleShopifyRedirects, handleShopifyRoutes} from '@shopify/hydrogen';
import {cartHandlers} from '~/lib/cart-handlers';
import {routeTemplates} from '~/lib/route-templates';
import {createEphemeralSessionManager} from '~/lib/session';
import {
  createRequestStorefrontClient, envContext, storefrontClientContext, storefrontRequestContext,
} from '~/lib/storefront';
import type {Route} from './+types/root';

export const middleware: Route.MiddlewareFunction[] = [
  async ({context, request}, next) => {
    const env = context.get(envContext);
    const storefrontClient = createRequestStorefrontClient(request, env, context.cache, context.waitUntil);
    const requestContext = storefrontClient.requestContext;    // reuse — a fresh one throws in handleShopifyRoutes
    const sessionManager = createEphemeralSessionManager(request);

    const shopifyRoute = handleShopifyRoutes({                 // handler-owned paths (e.g. /api/cart) return early
      request, requestContext, sessionManager, storefrontClient, routeTemplates, handlers: [cartHandlers],
    });
    if (shopifyRoute) return shopifyRoute;                     // Promise<Response> or null — do NOT await the call

    context.set(storefrontClientContext, storefrontClient);
    context.set(storefrontRequestContext, requestContext);

    const response = await next();

    const sessionHeaders = new Headers((await sessionManager.commit?.()) ?? undefined);
    for (const [name, value] of sessionHeaders) response.headers.append(name, value);
    if (response.status === 404) {                             // 404 → Shopify URL redirects
      const redirect = await handleShopifyRedirects({request, storefrontClient, routeTemplates});
      if (redirect) return redirect;                           // headers already applied by the library
    }
    requestContext.applyResponseHeaders(response.headers);     // MUST run or Shopify response headers vanish
    return response;
  },
];
```

`app/lib/session.ts` — the `sessionManager` contract is **four required methods** (item values are typed `unknown`, not `string`) plus an optional `commit()` that returns cookie headers, which the middleware above applies. A per-request in-memory map satisfies the contract and is enough for carts, but it **cannot complete Customer Account login**: the OAuth state is written on `/account/login` and read back on `/account/authorize`, two different requests. For customer accounts, copy the template's cookie-backed `createRequestSessionManager` (a signed `__Host-session` cookie built on `@remix-run/cookie` + `@remix-run/session`, keyed by `SESSION_SECRET`):

```ts
import type {WritableCustomerSessionManager} from '@shopify/hydrogen/customer-account';

export function createEphemeralSessionManager(request: Request): WritableCustomerSessionManager {
  const data = new Map<string, unknown>();
  const origin = new URL(request.url).origin;
  return {
    getSessionOrigin: () => origin,
    getSessionItem: (key) => data.get(key),
    setSessionItem: (key, value) => {
      data.set(key, value);
    },
    removeSessionItem: (key) => {
      data.delete(key);
    },
  };
}
```

Supporting files: `app/lib/cart-handlers.ts` → `export const cartHandlers = createCartServerHandlers()` (options: `fragment` to extend the cart query, `customerSession` to sync buyer identity — see `references/cart.md`); `app/lib/cart.ts` → `createCartComponents<typeof cartHandlers>()` yields `CartProvider`/`useCart`/`useCartForm`; when the store has customer accounts, add the `createCustomerAccountServerHandlers({customerSession, …})` group next to `cartHandlers` in the middleware's `handlers` array and swap the session manager for the cookie-backed one (see `references/customer-account.md`); `react-router.config.ts` → `{buildDirectory: 'dist', future: {v8_middleware: true}}`.

Two lines in that middleware are easy to omit and fail **silently**: `applyResponseHeaders` on the normal response path (Shopify response headers disappear) and `routeTemplates` into both handler calls (handler-owned URLs and redirect targets come out wrong). A third, `buyerIp` into `createShopifyRequestContext`, fails **loudly** for the private client (`TypeError: requestContext.buyerIp is required for private Storefront API clients`) — keep the `getBuyerIp` helper rather than deleting the option to silence it. For the customer-account session wiring, follow the `hydrogen-customer-account` packaged skill rather than extending the in-memory manager by hand.

## Optional subsystems

The outline above is the mandatory base; everything else (localization, customer accounts, analytics + consent, search, subscriptions, B2B, content routes, SEO/sitemap, gift cards, redirects, recommendations, third-party integrations) is store-specific. Before touching optional features, read `references/optional-subsystems.md` — it gives the detection grep for each, the sequence that matters (**localization → auth → analytics+consent**, since later ones consume the earlier ones' output, then the lower-coupling features in any order), and the rule to **report every skip explicitly** so a missing subsystem never reads as "migrated."

## Traps by area — read the matching reference when you touch that area

Most "builds fine but silently broken at runtime" failures live in the `references/` files below, grouped by the surface they hit. Read the file for a surface **before** you migrate that surface, and skip the ones the store doesn't have — don't preload them all. Loading only the relevant slice leaves context for the app's own files, which is what one-shot success actually depends on.

| Surface you're migrating | Read |
| --- | --- |
| Dependencies, scripts, Vite config, `.gitignore` | `references/dependencies-and-tooling.md` |
| Routes, loaders, `@remix-run`→`react-router` sweep, `useMatches` handles | `references/routing-and-loaders.md` |
| TypeScript + gql (these surface at `tsc` / `hydrogen gql check`) | `references/typescript-and-gql-tada.md` |
| Cart drawer, `/cart` page, optimistic lines, `initialData` | `references/cart.md` |
| Customer accounts, OAuth, login | `references/customer-account.md` |
| Analytics + consent | `references/analytics.md` |
| Variant form, presentational primitives, pagination, a11y, dead client glue | `references/ui-and-components.md` |
| Sitemap / SEO | `references/sitemap-and-seo.md` |

Each file is a short list of the specific "it renders but is wrong" traps for that surface — the failures you can't discover by reading the installed package. For deploying to Oxygen, read the `hydrogen-oxygen` packaged skill; the seed's `--assets-dir`/`--worker-dir` flags are the template's layout, one of the layouts that skill accepts.

## Verification

Don't trust "it renders." Gate on the build first: `react-router build` and `react-router typegen && tsc && hydrogen gql check --fail-on-warn` must both exit 0 (most import/return-helper and gql traps surface here — fix the root cause, don't suppress it; a red build makes everything downstream meaningless). Then run the local `hydrogen-smoke-test` skill for functional/runtime verification — request handlers, product, cart, collection/search, analytics, money, and the production pass. That skill owns "does the storefront work"; don't restate its checks here.

After the build gate and smoke test pass, **hand off to the user rather than running the dev server yourself.** Tell them they can test the migrated code with `npm run dev` (or `npm run dev:https` when they need customer login locally), and to pay special attention to the areas a migration most often gets subtly wrong while still compiling:

- **Analytics** — the commerce funnel (`view_item`/`add_to_cart`/…) silently dropping while page views still fire (`references/analytics.md`).
- **Cart actions** — add / remove / quantity edits and the drawer opening on add (`references/cart.md`).
- **Customer login** — the full OAuth round-trip, which needs an HTTPS origin locally (`references/customer-account.md`).
- **Product variant selection** — options must update client-side, not trigger a full route navigation (`references/ui-and-components.md`).
