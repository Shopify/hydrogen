---
name: hydrogen-oxygen
description: >
  Audit and adapt an existing Hydrogen storefront for Shopify Oxygen and local MiniOxygen. Use when asked to make a
  server-capable Hydrogen project Oxygen-compatible, add or repair its Worker server entrypoint, configure MiniOxygen,
  remove Node runtime assumptions, wire Worker environment, cache, and waitUntil, or verify dev, preview, and deploy
  behavior.
---

# Making A Hydrogen App Oxygen-Compatible

Treat Oxygen as a Web Worker runtime, not a Node server. Preserve the app's routes and storefront behavior while
adapting its server runtime, build output, and request lifecycle.

Master checklist:

```text
- [ ] Inspect the framework, server entrypoint, and build target
- [ ] Read the matching framework reference when available
- [ ] Produce an Oxygen-compatible module Worker at `<root>/server.ts` or configure its custom path
- [ ] Produce one server bundle and a public assets directory
- [ ] Run the Worker locally with MiniOxygen
- [ ] Thread env, cache, and waitUntil through each request
- [ ] Create request-dependent Shopify resources per request
- [ ] Remove Node-only runtime assumptions
- [ ] Typecheck and build
- [ ] Exercise dynamic routes in dev and preview
- [ ] Run Hydrogen smoke tests
```

## Inspect The App

Run from the app root. Read `package.json`, framework and bundler configuration, server and client entries, SSR setup,
request middleware, environment declarations, deployment scripts, and the existing production adapter. If there is no
`package.json`, stop and tell the user to run the skill from the app root.

Identify how the framework:

- turns an incoming Web `Request` into the app's request handler
- renders SSR responses and hydrates the browser
- passes request-scoped context to loaders, middleware, or server functions
- builds and selects its server entrypoint
- serves static assets alongside dynamic Worker responses

Read [references/react-router.md](references/react-router.md) for a React Router framework-mode app. For another
framework, apply the generic Oxygen contract below through its Worker adapter and existing conventions. Do not copy
React Router filenames or APIs into another framework. If no Worker adapter or build target exists, identify that gap
explicitly before changing application code.

## Preserve App Behavior

Keep existing routes, middleware, cart, customer accounts, analytics, search, redirects, cookies, and response headers
unless the user explicitly asks to remove them. Reuse the app's context and middleware architecture where possible. Do
not replace the app with a starter or rewrite framework-owned routing merely to change runtimes.

Keep route-template wiring used by `handleShopifyRedirects`, Shopify scripts, and predictive search. Oxygen compatibility
does not make those routes optional.

## Implement The Oxygen Worker Contract

Use `<root>/server.ts` as the default Worker entrypoint. Oxygen and MiniOxygen discover that path without extra
configuration. If the entrypoint lives elsewhere, configure the same project-relative path everywhere it is consumed:

- pass `entry` to MiniOxygen, for example `oxygen({ entry: "./src/worker.ts" })`
- pass `--entry ./src/worker.ts` to Shopify Hydrogen CLI commands that run or deploy the Worker

Do not rely on a framework's server-file convention to make a custom entrypoint discoverable by Oxygen.

Produce a module Worker whose default export handles requests with the platform values Oxygen provides:

```ts
export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const waitUntil = executionContext.waitUntil.bind(executionContext);
    const cache = await caches.open("hydrogen");

    return handleRequest(request, { env, waitUntil, cache });
  },
};
```

Adapt `handleRequest` and the context shape to the framework. The server build must bundle this entry as a Web-compatible
module Worker and return a standard `Response`. Use Web APIs such as `Request`, `Response`, `Headers`, `URL`, `fetch`,
Web Crypto, and Web streams throughout runtime code.

Keep server rendering Web-compatible. Use the framework's Worker renderer or Web-stream renderer instead of a Node
stream renderer. Add or change a browser hydration entry only when the framework requires it; see the matching reference
for exact entry files.

## Configure MiniOxygen And Deployment

Use MiniOxygen to run the same Worker contract locally. For a Vite app:

- preserve an existing compatible `@shopify/mini-oxygen` version; otherwise install the latest available version
- add `@shopify/oxygen-workers-types`
- add `oxygen()` from `@shopify/mini-oxygen/vite` to the Vite plugins
- make both development and built preview modes execute the Worker entrypoint

Require MiniOxygen 4.2.0 or newer for the behavior described here. Do not replace a compatible existing version merely
to change its version range.

Use plain `oxygen()` when the app uses `<root>/server.ts` and does not need explicit binding configuration; MiniOxygen
uses Vite's environment loading when no `env` option is provided. Values can come from the active mode's `.env` files
and from variables already exported into `process.env`; Vite merges both sources. Worker runtime code receives the
result through its `env` argument rather than reading `process.env`. Otherwise pass the custom `entry` or bindings
explicitly. For a non-Vite build, use the framework's Worker adapter or MiniOxygen integration instead of introducing
Vite only to copy another framework's setup.

Add `@shopify/cli` and a `shopify hydrogen deploy` script when the project does not already have a supported Oxygen
deployment path. Use the latest available `@shopify/cli`. Preserve the installed `@shopify/hydrogen` version unless the
user separately asks to upgrade it.

## Produce Deployable Build Output

Build two deployable outputs:

- one bundled Worker server module
- one directory containing public client assets

Configure the server build to avoid code splitting. Oxygen expects a single executable Worker bundle rather than a
server entry that depends on additional server chunks.

### Default Vite Layout

For the common Vite setup with `<root>/server.ts`, let the Oxygen plugin detect output locations from Vite
configuration. `vite preview` and `shopify hydrogen deploy` generally need no `previewEntry`, `--assets-dir`, or
`--worker-dir` overrides. When Vite does not expose custom locations, Oxygen prefers this fallback layout:

```text
dist/
├── client/
└── server/
    └── index.js
```

The Worker file may use `.js` or `.mjs`. A build may also emit `oxygen.json` beside the Worker as a compatibility-date
artifact; preserve and deploy it with the server output.

### Custom Or Non-Default Layout

Only add explicit output configuration when the framework emits a layout that Oxygen or MiniOxygen does not discover:

- pass the built Worker file to MiniOxygen as `previewEntry` so `vite preview` executes it
- pass the asset directory to deployment with `--assets-dir <path>`
- pass the Worker directory to deployment with `--worker-dir <path>`

For example:

```ts
oxygen({
  entry: "./src/worker.ts",
  previewEntry: "./build/server/index.mjs",
});
```

```sh
shopify hydrogen deploy --assets-dir ./build/client --worker-dir ./build/server
```

Treat `entry` and `previewEntry` as different stages: `entry` points to the source Worker used during development;
`previewEntry` points to the built Worker module. The directory passed to `--worker-dir` must contain `index.js` or
`index.mjs` at its root. Pass directories, not individual files, to `--assets-dir` and `--worker-dir`.

## Keep Request State Request-Scoped

Pass the incoming `env`, bound `waitUntil`, and an Oxygen cache through the framework's request context. Pass `cache`
and `waitUntil` together in the Hydrogen client config:

```ts
createStorefrontClient({
  // Existing client options...
  config: {
    // Existing config options...
    cache,
    waitUntil,
  },
});
```

The `Cache` returned by `caches.open("hydrogen")` is accepted directly by Hydrogen clients. Remove custom cache
adapters and process-local cache dependencies such as `lru-cache`; do not wrap the Workers cache in an adapter.
`waitUntil` lets background cache revalidation continue after the response has been returned, so pass the bound
function whenever the platform provides it.

Create values that depend on the request, environment, headers, locale, session, or response headers inside the request
lifecycle, including:

- `createShopifyRequestContext(...)`
- `createStorefrontClient(...)`
- `createCustomerAccountClient(...)`
- cart and customer session managers
- request-specific response header collections

Keep only pure constants and stateless factories at module scope. Use `caches.open("hydrogen")` instead of a process-local
LRU cache for Hydrogen request caching, and use `executionContext.waitUntil` for background cache work.

## Configure Environment And Types

Declare the Worker's actual `Env` bindings and include `@shopify/oxygen-workers-types` in app runtime types. Keep
`.env.example` committed with placeholders and `.env` ignored. Let Oxygen provide deployed secrets as environment
bindings and MiniOxygen provide local bindings.

Read server secrets from the request's `env`, never from `process.env` or browser-importable modules. Keep public browser
configuration separate from private Worker bindings. Start from the existing TypeScript config rather than replacing it;
retain Node types where build tooling genuinely needs them. Node and Worker types can usually coexist when one TypeScript
program includes both Worker runtime code and Vite or build files. If their globals conflict, use separate runtime and
build-tool tsconfigs instead of masking the conflict with `skipLibCheck`.

## Remove Incompatible Runtime Assumptions

Inspect server runtime code for:

- `process`, `Buffer`, `node:*`, filesystem, and Node crypto APIs
- Node streams and Node-specific SSR renderers
- framework Node server adapters and start commands
- CommonJS globals or dependencies that require `module` or `require` at runtime
- in-memory caches used in place of the Workers Cache API
- classic Hydrogen runtime or Vite integrations

Replace each runtime dependency with a Web API or the framework's Worker adapter. Do not mechanically remove packages
used only by build configuration, tests, or transitive dependencies.

## Verify The Result

Run the applicable formatter, lint, typecheck, GraphQL validation, tests, and production build. Run both development and
built preview modes under MiniOxygen, then request routes that exercise server rendering and Hydrogen data rather than
only static assets.

At minimum, check `/`, one product, one collection, `/search`, `/cart`, and `/account` when those routes exist. Confirm
environment bindings load, dynamic responses come from the Worker, mutations preserve cookies and headers, cache work
uses `waitUntil`, and no Node or CommonJS runtime error appears. A server starting is not sufficient evidence that the
Worker request path works.

Use the local `hydrogen-smoke-test` skill for broader Hydrogen request-handler, cart, analytics, markets, and production
checks. Exercise mutations through the real cart UI or the framework's cart action rather than hand-crafting an internal
Hydrogen payload; follow that skill for the concrete cookie and header checks. Fix failures and rerun the affected checks.
Report every validation step that could not be completed and why.

## Stop Conditions

- No `package.json` exists at the current app root.
- The app is static-only and has no server request lifecycle to deploy.
- The framework cannot produce a module Worker and no suitable adapter or server-build hook is available.
- Required production secrets are unavailable for live route verification; complete static/build verification and
  report runtime checks as blocked instead of inventing values.
