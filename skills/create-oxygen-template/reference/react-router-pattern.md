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

Ship a `.env.example` (committed, blank) and a gitignored `.env`. Only the two real secrets are required; everything
else public lives in `app/lib/config.ts` (see config split). To smoke-test against the demo store in this repo, obtain
a real `PRIVATE_STOREFRONT_API_TOKEN` with `node scripts/decrypt-example-secrets.ts` (needs the ejson key locally).

```sh
SESSION_SECRET="replace-with-a-long-random-secret-32+"
PRIVATE_STOREFRONT_API_TOKEN=""
# PUBLIC_STORE_DOMAIN="your-shop.myshopify.com"   # optional override of app/lib/config.ts
```

Add or update TypeScript declarations so the Worker env is typed:

```ts
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="react-router" />
/// <reference types="vite/client" />

declare global {
  interface Env {
    SESSION_SECRET: string;
    PRIVATE_STOREFRONT_API_TOKEN: string;
    PUBLIC_STORE_DOMAIN?: string;
  }
}

export {};
```

Add typed React Router contexts for Worker values the app needs, such as `env`, `cache`, and `waitUntil`. Use `createContext<T>()`/`RouterContextProvider` consistently so middleware and loaders do not reach for globals or `process.env`.

Start from the copied `tsconfig.json`; do not replace it wholesale. Update `types` to `["@shopify/oxygen-workers-types", "react-router", "vite/client"]` and remove `node`. Under `verbatimModuleSyntax`, any binding used only in a type position must use `import type`. Example: `defaultI18n` in `app/lib/storefront.ts` is used only as `typeof defaultI18n`, so it must be `import type {defaultI18n}`.

Keep `@types/node` in `devDependencies` (build tooling needs it at runtime); it is just not in the app `types` array.

Keep `hydrogen gql check --fail-on-warn` in `typecheck` and preserve the `@shopify/hydrogen/ts-plugin` entry from the source example. Hydrogen packages both schemas and their gql.tada tooling.

## Shared code migration

Replace each `@shared/*` import with template-local code:

- config constants -> local `app/lib/config.ts` (see config split below)
- private token lookup -> local `app/lib/env.ts`
- buyer IP helper -> local `app/lib/buyer-ip.ts` (replace `process.env.NODE_ENV` with `import.meta.env.PROD`)
- encrypted customer session -> copy into `app/lib/customer-session.ts` if Customer Account remains enabled (it is
  already Web-Crypto based and Oxygen-safe)
- storefront cache adapter -> remove if replacing LRU with Oxygen `caches.open`
- local HTTPS/CDN helpers -> do not copy

Additionally, keep `lib/route-templates.ts` unchanged — `routeTemplates` is required by `handleShopifyRedirects({routeTemplates})`, `<ShopifyScripts routes={routeTemplates}>`, and `getPredictiveSearchItemUrl(product, {routes: routeTemplates, …})`.

**Config split (public vs secret).** Do not try to make everything env-driven — `ShopifyScripts` (in the root
`Layout`) and analytics run on the CLIENT, where the Worker `env` is not available. Split it:

- Public identity -> bundled `app/lib/config.ts` (store domain, public Storefront token, shop/storefront IDs,
  Customer Account client ID, `defaultI18n`, `analyticsShop`, `analyticsConsent`). These are non-secret and safe in the
  client bundle; default them to the demo store so the template runs out of the box.
- Real secrets -> Worker `env`, read on the server only: `SESSION_SECRET`, `PRIVATE_STOREFRONT_API_TOKEN`, plus an
  optional `PUBLIC_STORE_DOMAIN` override. Read them in root middleware, not at module scope.

This avoids a fragile loader->client refactor and keeps every feature working. Note this applies beyond root middleware: route modules also import public identity (e.g. `analyticsShop`) on the client, so keeping it as a bundled `config.ts` constant — rather than something read from `env` — is what makes those client imports work.

Keep Customer Account, cart, search, analytics, and other example features unless the user explicitly asks to remove them.
