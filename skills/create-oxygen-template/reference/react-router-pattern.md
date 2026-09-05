# React Router Template Pattern

Concrete file-by-file shape for `templates/react-router`. Read this when implementing or maintaining the template.
Do not generalize these instructions to framework examples such as Next, Nuxt, Astro, Solid, or SvelteKit
without adding framework-specific guidance first. For the high-level workflow, dependency mechanism, lockfile, and
validation, see [SKILL.md](../SKILL.md).

## Contents

- package.json
- vite.config.ts
- react-router.config.ts
- server.ts
- entry.server.tsx and entry.client.tsx (REQUIRED)
- Worker lifecycle
- Oxygen cache
- Env and types
- Shared code migration

## package.json

Rename the package from example to template, for example:

```json
"name": "@shopify/hydrogen-template-react-router"
```

Use Vite/React Router scripts, not Hydrogen CLI dev/build scripts:

```json
{
  "scripts": {
    "dev": "vite dev",
    "https:dev": "vite dev",
    "build": "react-router build",
    "preview": "react-router build && vite preview",
    "typecheck": "react-router typegen && tsc --noEmit && hydrogen gql check --fail-on-warn",
    "deploy": "shopify hydrogen deploy --assets-dir dist/client --worker-dir dist/server"
  }
}
```

Remove Node-server scripts such as `start: react-router-serve ...` unless explicitly requested.

Dependencies:

- Keep app dependencies required by the template, such as `@shopify/hydrogen`, React, React Router, and `isbot`.
- Remove `lru-cache`, `@react-router/node`, and `@react-router/serve`.
- Add `@shopify/mini-oxygen`, `@shopify/oxygen-workers-types`, and `@shopify/cli`.
- **`@shopify/hydrogen`: use `workspace:*` in this repository** so template builds and E2E exercise the package under
  development. The `Shopify/hydrogen` release flow replaces it with the version selected by the `preview` dist-tag
  before standalone lockfile generation. Preview cuts use `2026.10.0-preview.<n>` and must resolve to a registry
  tarball with an integrity hash.
- **`@shopify/cli`: pin `4.6.0` (minimum `4.4.0`)**. Those releases support the explicit deploy output flags. Keep
  `--assets-dir dist/client --worker-dir dist/server` in the deploy script so the CLI runs `react-router build` and
  uses this template's configured output without relying on a Hydrogen version sniff.
- **Package manager:** use `pnpm@10.33.0` in the source template so the monorepo has one package manager and lockfile.
  The preview dist compiler changes the standalone template to `npm@11.17.0` before generating `package-lock.json`.
- **`@shopify/mini-oxygen`: pin `^4.2.0`** — its `oxygen()` plugin adds `configurePreviewServer`, which `vite preview`
  needs to run the Worker.
- Add `"engines": {"node": "^22 || ^24"}`.
- Replace `catalog:` ranges with npm-compatible semver ranges. Keep `@types/node` in `devDependencies` and `node` in
  the app tsconfig `types` while build tooling such as `vite.config.ts` belongs to the project.
- Choose other package versions at implementation time; prefer the versions already present in the example's package files.

## vite.config.ts

Use MiniOxygen and React Router, the Hydrogen local HTTPS plugin, and framework-neutral plugins the template genuinely needs:

```ts
import {reactRouter} from "@react-router/dev/vite";
import {localHttps} from "@shopify/hydrogen/vite";
import {oxygen} from "@shopify/mini-oxygen/vite";
import tailwindcss from "@tailwindcss/vite";
import {defineConfig} from "vite";

const oxygenPlugins = oxygen();
const oxygenPlugin = oxygenPlugins.find((plugin) => plugin.name === "oxygen:main");

if (!oxygenPlugin?.api) throw new Error("MiniOxygen plugin API is unavailable.");

// Keep the checked-in compatibility-date override while preview releases can
// infer a future date. Remove it when MiniOxygen no longer needs the guard.
oxygenPlugin.api.registerPluginOptions({compatibilityDate: "2026-04-01"});

const httpsEnabled =
  process.env.VITE_LOCAL_HTTPS === "1" || process.env.npm_lifecycle_event === "https:dev";

export default defineConfig({
  plugins: [localHttps({enabled: httpsEnabled}), tailwindcss(), ...oxygenPlugins, reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    assetsInlineLimit: 0,
  },
  ssr: {
    optimizeDeps: {
      // Must include the React runtime, not just react-router. A hydrogen()-free
      // template does not get React pre-bundled for the Oxygen runtime, so dev
      // fails with `ReferenceError: module is not defined at .../react/jsx-dev-runtime.js`.
      include: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom",
        "react-dom/server",
        "react-router > set-cookie-parser",
        "react-router > cookie",
        "react-router",
      ],
    },
  },
});
```

Keep the Hydrogen `localHttps` plugin when Customer Account support is enabled. Do not add `localCdnAssets` or `hydrogen()` from classic Hydrogen. Preserve an existing `allowedHosts` entry when the template uses it for Hydrogen preview hosts; otherwise let `localHttps` configure its own host.

Keep the `build.assetsInlineLimit: 0` and `ssr.optimizeDeps.include` interop settings unless a successful Worker build and MiniOxygen runtime test proves they are unnecessary. They prevent common CJS/ESM runtime failures in the Oxygen runtime such as `module is not defined` / `require is not defined`. Use plain `oxygen()`; MiniOxygen auto-loads `.env` into the Worker via its own `loadEnv` fallback when no `env` option is provided.

## react-router.config.ts

Preserve the React Router config behavior required by the app:

```ts
export default {
  appDirectory: "app",
  buildDirectory: "dist",
  ssr: true,
  subResourceIntegrity: false,
  future: {
    v8_middleware: true,
    unstable_optimizeDeps: true,
  },
};
```

Preserve any additional future flags that the template needs. Keep `buildDirectory: "dist"` aligned with the deploy script's `dist/client` and `dist/server` flags. If one changes, update the other in the same change.

## server.ts

Add a Worker module entrypoint that creates the React Router request handler directly:

```ts
import {createRequestHandler} from "react-router";
import * as serverBuild from "virtual:react-router/server-build";

const handleRequest = createRequestHandler(serverBuild, import.meta.env.MODE);

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const context = await createAppLoadContext(request, env, executionContext);

    return handleRequest(request, context);
  },
};
```

Prefer `import.meta.env.MODE` for the Vite/Oxygen template entrypoint. Do not introduce a Node-oriented `process.env.NODE_ENV` dependency unless existing template code already requires it and it has been verified in MiniOxygen.

Implement `createAppLoadContext` using React Router's context API and the example's existing middleware expectations. This function is the right place to create request-scoped Worker resources and expose them to middleware/loaders:

```ts
async function createAppLoadContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const cache = await caches.open("hydrogen-v1");
  const context = new RouterContextProvider();

  context.set(envContext, env);
  context.set(waitUntilContext, waitUntil);
  context.set(cacheContext, cache);

  return context;
}
```

Use actual context names that match the template. Keep Shopify initialization and request handling in root middleware,
with `server.ts` responsible only for providing Worker values through React Router context and invoking the framework
request handler. The root middleware owns `handleShopifyRoutes` before `next()`, `handleShopifyRedirects` after a
framework 404, and storefront response headers on framework responses. Shopify handler responses already include
their own storefront response headers. The catch-all route should only produce the framework 404 that lets the root
middleware check for a Shopify redirect.

## entry.server.tsx and entry.client.tsx (REQUIRED)

Removing `@react-router/node` removes the default server runtime, so `react-router typegen` and `react-router build`
fail with `Could not determine server runtime. Please install @react-router/node, or provide a custom
entry.server.tsx/jsx`. Add both entries. Write minimal, Oxygen-compatible versions — do NOT copy the classic-Hydrogen
example's entries, which import CSP/nonce from `@shopify/hydrogen-classic`.

`app/entry.server.tsx` (Web-streams renderer, not the Node stream renderer):

```tsx
import {isbot} from "isbot";
import {renderToReadableStream} from "react-dom/server";
import {ServerRouter} from "react-router";
import type {EntryContext} from "react-router";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
) {
  let statusCode = responseStatusCode;
  const body = await renderToReadableStream(
    <ServerRouter context={reactRouterContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error) {
        console.error(error);
        statusCode = 500;
      },
    },
  );
  if (isbot(request.headers.get("user-agent"))) await body.allReady;
  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {headers: responseHeaders, status: statusCode});
}
```

`app/entry.client.tsx`:

```tsx
import {startTransition, StrictMode} from "react";
import {hydrateRoot} from "react-dom/client";
import {HydratedRouter} from "react-router/dom";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
```

## Worker lifecycle

Oxygen is a Worker runtime. Do not create request-specific Shopify objects at module scope. Create these per request because they depend on the incoming `Request`, `Env`, headers, sessions, locale, or response header collection:

- `createShopifyRequestContext(...)`
- `createStorefrontClient(...)`
- `createCustomerAccountClient(...)`
- customer session managers
- cart, predictive search, and customer account route handling inputs
- `caches.open("hydrogen-v1")` handles used with request-specific `waitUntil`

Module scope is only appropriate for pure constants and stateless handler factories that do not capture request/env/session data. When in doubt, keep the object request-scoped until MiniOxygen runtime validation proves otherwise.

Keep request-time values in context instead of imported shared constants. Root middleware reads `env`, `cache`, and `waitUntil` from React Router context before creating `createShopifyRequestContext`, `createStorefrontClient`, and the storefront client (pass `cache` and `waitUntil` on its `config`).

## Oxygen cache

Hydrogen primitives that use cached fetches must receive an Oxygen-compatible cache created in the request flow:

```ts
const cache = await caches.open("hydrogen-v1");
const waitUntil = executionContext.waitUntil.bind(executionContext);
```

Pass `cache` directly to `createStorefrontClient`'s `config` — the client wraps its fetch internally (the example does this; an Oxygen template should also pass `waitUntil`). Do not use `createFetchWithCache` or the example's `lru-cache` adapter in an Oxygen template. (Passing per-query `cache:` strategies to `graphql()` requires `cache` on the client config, or it throws `StorefrontCacheConfigError` at runtime.)

## Env and types

Ship a committed `.env.example` and a gitignored `.env`. With no private Storefront API token, the template uses
mock.shop. Once a private token is present, require the complete real-store identity instead of mixing it with demo
defaults. Keep `.env.example` as the exhaustive variable reference; README prose and this reference should point to
it rather than copy a list that can drift.

Add or update TypeScript declarations so the Worker env is typed:

```ts
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="react-router" />
/// <reference types="vite/client" />

import type {Env as AppEnv} from "./app/lib/env";

declare global {
  interface Env extends AppEnv {}
}

export {};
```

Add typed React Router contexts for Worker values the app needs, such as `env`, `cache`, and `waitUntil`. Use `createContext<T>()`/`RouterContextProvider` consistently so middleware and loaders do not reach for globals or `process.env`.

Do not replace `tsconfig.json` wholesale. Keep `types` aligned with the checked-in template, including `node` while `vite.config.ts` belongs to the project. Under `verbatimModuleSyntax`, any binding used only in a type position must use `import type`. Worker runtime files must still avoid Node APIs.

Keep `@types/node` in `devDependencies` and `node` in the app `types` array so shared build-tool configuration typechecks.

Keep `hydrogen gql check --fail-on-warn` in `typecheck` and preserve the `@shopify/hydrogen/ts-plugin` entry. Hydrogen packages both schemas and their gql.tada tooling.

## Shared code migration

Replace each `@shared/*` import with template-local code:

- runtime configuration and private token resolution -> local `app/lib/shop.ts`
- buyer IP helper -> local request middleware such as `app/lib/storefront.ts` (use `import.meta.env` instead of `process.env`)
- encrypted customer session -> copy into `app/lib/customer-session.ts` if Customer Account remains enabled (it is
  already Web-Crypto based and Oxygen-safe)
- storefront cache adapter -> remove if replacing LRU with Oxygen `caches.open`
- local CDN helpers -> do not copy
- legacy local HTTPS helpers -> replace with `localHttps` from `@shopify/hydrogen/vite`, using its portable default certificate paths

Additionally, keep `lib/route-templates.ts` unchanged — `routeTemplates` is required by `handleShopifyRedirects({routeTemplates})`, `<ShopifyScripts routes={routeTemplates}>`, and `getPredictiveSearchItemUrl(product, {routes: routeTemplates, …})`.

**Runtime configuration.** Resolve mock/real mode once per request in middleware. No private token means mock.shop;
once a private token is present, require the real store domain and storefront ID. Customer Accounts are disabled when
all account values are absent and rejected as misconfigured when only some are present.

Pass the resolved public Shopify Scripts and analytics identity through root loader data. Do not import Worker `env`
from client modules, and do not silently fall back to another store's identity in real-store mode. Keep static locale
and consent defaults in a bundled config module because they are not store credentials.

Keep Customer Account, cart, search, analytics, and other example features unless the user explicitly asks to remove them.
