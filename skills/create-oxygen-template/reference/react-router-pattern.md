# React Router Template Pattern

Concrete file-by-file shape for `examples/react-router` -> `templates/react-router`. Read this when implementing the
template. Do not generalize these instructions to framework examples such as Next, Nuxt, Astro, Solid, or SvelteKit
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
    "build": "react-router build",
    "preview": "react-router build && vite preview",
    "typecheck": "react-router typegen && tsc --noEmit && hydrogen gql check --fail-on-warn",
    "deploy": "shopify hydrogen deploy"
  }
}
```

Remove Node-server scripts such as `start: react-router-serve ...` unless explicitly requested.

Dependencies:

- Keep app dependencies required by the example, such as `@shopify/hydrogen`, React, React Router, and `isbot`.
- Remove `lru-cache`, `@react-router/node`, and `@react-router/serve`.
- Add `@shopify/mini-oxygen`, `@shopify/oxygen-workers-types`, and `@shopify/cli`.
- **`@shopify/hydrogen`: use `preview`**. The published preview resolves to a `0.0.0-preview-*` registry package,
  exposes the React Router template surface (including `./customer-account` and `./package.json`), and satisfies
  `shopify hydrogen deploy`'s `isHydrogenPreviewVersion` check (CLI #3819) so deploy runs `react-router build`. No
  repo-local dependency, vendored tarball, or version hack is needed.
- **`@shopify/cli`: pin `3.94.3`** unless a newer version has been verified with the deploy path.
- **`@shopify/mini-oxygen`: pin `^4.2.0`** — its `oxygen()` plugin adds `configurePreviewServer`, which `vite preview`
  needs to run the Worker.
- Add `"engines": {"node": "^22 || ^24"}`.
- Replace `catalog:` ranges with npm-compatible semver ranges. Keep `@types/node` in `devDependencies` (build tooling
  such as `vite.config.ts` needs it) even though it is dropped from the app tsconfig `types` (see "Env and types").
- Choose other package versions at implementation time; prefer the versions already present in the example's package files.

## vite.config.ts

Use MiniOxygen and React Router only, plus framework-neutral plugins the template genuinely needs:

```ts
import {reactRouter} from "@react-router/dev/vite";
import {oxygen} from "@shopify/mini-oxygen/vite";
import tailwindcss from "@tailwindcss/vite";
import {defineConfig} from "vite";

export default defineConfig({
  plugins: [tailwindcss(), oxygen(), reactRouter()],
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

Do not add `localCdnAssets`, local HTTPS plugins, `hydrogen()` from classic Hydrogen, or `allowedHosts` unless separately requested.

Keep the `build.assetsInlineLimit: 0` and `ssr.optimizeDeps.include` interop settings unless a successful Worker build and MiniOxygen runtime test proves they are unnecessary. They prevent common CJS/ESM runtime failures in the Oxygen runtime such as `module is not defined` / `require is not defined`. Use plain `oxygen()`; MiniOxygen auto-loads `.env` into the Worker via its own `loadEnv` fallback when no `env` option is provided.

## react-router.config.ts

Start from the copied React Router config and preserve behavior required by the app:

```ts
export default {
  ssr: true,
  subResourceIntegrity: false,
  future: {
    v8_middleware: true,
    unstable_optimizeDeps: true,
  },
};
```

Preserve any additional future flags that the source example already needs. Do not force `buildDirectory: "dist"` unless the current MiniOxygen/deploy tooling or the user explicitly requires it.

## server.ts

Add a Worker module entrypoint that creates the React Router request handler directly:

```ts
import {createRequestHandler} from "react-router";
import * as serverBuild from "virtual:react-router/server-build";

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const handleRequest = createRequestHandler(serverBuild, import.meta.env.MODE);
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
  const cache = await caches.open("hydrogen");
  const context = new RouterContextProvider();

  context.set(envContext, env);
  context.set(waitUntilContext, waitUntil);
  context.set(cacheContext, cache);

  return context;
}
```

Use actual context names that match the template. If the app currently initializes Shopify context in root middleware, either:

- keep that middleware and provide `env`, `waitUntil`, and `cache` through React Router context, or
- move only the top-level request setup into `server.ts` while preserving route behavior.

Prefer the smaller app-code change. The React Router example already has most Shopify route handling in middleware; adapt it rather than rewriting route modules.

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
- `caches.open("hydrogen")` handles used with request-specific `waitUntil`

Module scope is only appropriate for pure constants and stateless handler factories that do not capture request/env/session data. When in doubt, keep the object request-scoped until MiniOxygen runtime validation proves otherwise.

Expect to adjust app code so request-time values come from context instead of imported shared constants. For example, root middleware may need to read `env`, `cache`, and `waitUntil` from React Router context before creating `createShopifyRequestContext`, `createStorefrontClient`, and the storefront client (pass `cache` on its `config`; an Oxygen template should also pass `waitUntil`).

## Oxygen cache

Hydrogen primitives that use cached fetches must receive an Oxygen-compatible cache created in the request flow:

```ts
const cache = await caches.open("hydrogen");
const waitUntil = executionContext.waitUntil.bind(executionContext);
```

Pass `cache` directly to `createStorefrontClient`'s `config` — the client wraps its fetch internally (the example does this; an Oxygen template should also pass `waitUntil`). Do not use `createFetchWithCache` or the example's `lru-cache` adapter in an Oxygen template. (Passing per-query `cache:` strategies to `graphql()` requires `cache` on the client config, or it throws `StorefrontCacheConfigError` at runtime.)

## Env and types

Ship a `.env.example` (committed, blank) and a gitignored `.env`. Keep the authoritative env list in
`templates/react-router/.env.example`; do not duplicate it in prose. The required real-store input is a private
Storefront API token, while Customer Accounts are optional and require their own account/session env vars.

```sh
PRIVATE_STOREFRONT_API_TOKEN=""
# PUBLIC_STORE_DOMAIN="your-shop.myshopify.com"
# CUSTOMER_ACCOUNT_SESSION_SECRET="replace-with-a-long-random-secret-32+"
```

Add or update TypeScript declarations so the Worker env is typed:

```ts
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="react-router" />
/// <reference types="vite/client" />

import type { Env as AppEnv } from "./app/lib/platform";

declare global {
  interface Env extends AppEnv {}
}

export {};
```

Add typed React Router contexts for Worker values the app needs, such as `env`, `cache`, and `waitUntil`. Use `createContext<T>()`/`RouterContextProvider` consistently so middleware and loaders do not reach for globals or `process.env`.

Start from the copied `tsconfig.json`; do not replace it wholesale. Include `@shopify/oxygen-workers-types`, `react-router`, and `vite/client` in `types`. Keep `node` only when build tooling in the same TypeScript program needs it. Under `verbatimModuleSyntax`, any binding used only in a type position must use `import type`.

Keep `@types/node` in `devDependencies` (build tooling needs it at runtime); it is just not in the app `types` array.

Keep `hydrogen gql check --fail-on-warn` in `typecheck` and preserve the `@shopify/hydrogen/ts-plugin` entry from the source example. Hydrogen packages both schemas and their gql.tada tooling.

## Shared code migration

Replace each `@shared/*` import with template-local code:

- config constants -> local `app/lib/config.ts` (see config split below)
- Worker env/context helpers -> local `app/lib/platform.ts`
- private token lookup and buyer IP helper -> local `app/lib/config.ts`
- encrypted customer session -> copy into `app/lib/customer-session.ts` if Customer Account remains enabled (it is
  already Web-Crypto based and Oxygen-safe)
- storefront cache adapter -> remove if replacing LRU with Oxygen `caches.open`
- local HTTPS/CDN helpers -> do not copy

Additionally, keep `lib/route-templates.ts` unchanged — `routeTemplates` is required by `handleShopifyRedirects({routeTemplates})`, `<ShopifyScripts routes={routeTemplates}>`, and `getPredictiveSearchItemUrl(product, {routes: routeTemplates, …})`.

**Config split (public vs secret).** Keep Worker env reads behind `app/lib/platform.ts` and route/middleware boundaries. Split it:

- Public defaults -> bundled `app/lib/config.ts` (`defaultI18n`, analytics consent, fallback shop identity). These are non-secret and keep the template running out of the box.
- Runtime bindings -> Worker `env`, read on the server only and passed through root loader data when browser code needs public values such as Shopify Scripts shop identity.
- Real secrets -> Worker `env`, read in root middleware, not at module scope.

This keeps private values server-only while still letting browser code receive safe public values through loader data.

Keep Customer Account, cart, search, analytics, and other example features unless the user explicitly asks to remove them.
