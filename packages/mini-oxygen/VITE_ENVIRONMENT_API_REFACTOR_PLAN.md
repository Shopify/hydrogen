# MiniOxygen Vite Environment API Refactor Plan

## Goal

Move the `@shopify/mini-oxygen/vite` integration from a custom "Vite server + ad hoc middleware + custom module fetch endpoint" model to Vite's Environment APIs, without breaking current Hydrogen development features.

This plan targets:

- Workerd-based SSR in dev remains the default.
- The public `oxygen()` plugin can stay stable for apps.
- Hydrogen and CLI features keep working during the migration.
- CLI-owned runtime options can still be passed into MiniOxygen during and after the refactor.
- Vite-specific glue shrinks and moves onto supported environment/runtime primitives.

## Non-goals

- Do not switch dev SSR back to Node.
- Do not require app-level config changes in the first pass.
- Do not add full runner-side HMR in workerd in phase 1.
- Do not rewrite the MiniOxygen worker runtime unless required by the Vite refactor.

## Current integration to replace

Today the Vite integration is split across:

- `src/vite/plugin.ts`
  - Forces worker-like SSR config (`target: 'webworker'`, `workerd` conditions, `appType: 'custom'`).
  - Exposes `registerPluginOptions(...)`, which Hydrogen and CLI call indirectly.
- `src/vite/server-middleware.ts`
  - Installs `/__vite_fetch_module`.
  - Lazily boots MiniOxygen/workerd.
  - Forwards unmatched backend requests from Vite to MiniOxygen.
  - Builds a secondary `setup-environment` worker for Node-to-workerd setup.
- `src/vite/worker-entry.ts`
  - Runs inside workerd.
  - Creates a singleton `ModuleRunner`.
  - Fetches transformed SSR modules back from Vite over HTTP.
  - Uses Miniflare `unsafeEvalBinding` to evaluate transformed modules in workerd.
- `packages/hydrogen/src/vite/plugin.ts`
  - Finds `oxygen:main` by plugin name in `configResolved()`.
  - Pushes `compatibilityDate`, `HYDROGEN_PROJECT_ROOT`, request logging, and `crossBoundarySetup` into MiniOxygen.
- `packages/cli/src/commands/hydrogen/dev.ts`
  - Pushes the worker entry path, remote env vars, debug flags, and entrypoint error handling into MiniOxygen using the same plugin API.

The main coupling to preserve is not only "run SSR in workerd", but also:

- top-level request logging via `requestHook`
- Hydrogen subrequest logging via `__H2O_LOG_EVENT`
- React Router / Remix critical CSS lookup via `__remix_devServerHooks.getCriticalCss`
- compatibility date propagation for both dev and build
- entrypoint optimization errors and auto-fix behavior
- inspector/debugger support
- streaming and redirect behavior

## Recommended end state

### 1. MiniOxygen owns a custom `ssr` environment

`oxygen()` should configure the app so the default `ssr` environment is a workerd-backed custom environment instead of the default Node runner.

Use the existing `ssr` environment name, not a new `oxygen` or `workerd` environment, to minimize churn in:

- app code
- React Router integration
- Hydrogen middleware assumptions
- build behavior
- `server.environments.ssr` access patterns

### 2. Introduce a `MiniOxygenDevEnvironment`

Add a dedicated dev-environment wrapper in `packages/mini-oxygen/src/vite/`.

Suggested shape:

- `MiniOxygenDevEnvironment`
  - wraps a Vite fetchable environment for request dispatch
  - owns lazy MiniOxygen runtime startup
  - owns worker bootstrap / runner transport wiring
  - exposes MiniOxygen-specific methods for frameworks and CLI
- `isMiniOxygenDevEnvironment(value): boolean`
  - runtime guard for Hydrogen and CLI

Suggested methods:

- `configureRuntime(options: Partial<MiniOxygenRuntimeOptions>): void`
- `registerRuntimeBridge(bridge: MiniOxygenRuntimeBridge): void`
- `dispatchFetch(request: Request): Promise<Response>`
- `dispose(): Promise<void>`

`MiniOxygenRuntimeOptions` should cover the current dynamic config surface, including values the CLI resolves asynchronously:

- `entry`
- `env`
- `envPromise`
- `debug`
- `inspectorPort`
- `compatibilityDate`
- `logRequestLine`
- `requestHook`
- `entryPointErrorHandler`

### 3. Keep MiniOxygen as the runtime provider

The Vite Environment API should replace the Vite-specific glue, not MiniOxygen itself.

MiniOxygen should still own:

- Miniflare/workerd lifecycle
- routing worker behavior
- Oxygen headers
- redirect handling
- streaming behavior
- outbound service / proxy behavior
- inspector / DevTools integration

### 4. Split "runtime bootstrap" from "runtime RPC"

The current `crossBoundarySetup` array is too generic for the long term. Replace it with typed mechanisms:

- `runtimeScripts`
  - pure workerd-side bootstrap code
  - no Node callback required
  - example: patch `Error.prototype.toString`
- `rpcBridges`
  - workerd code needs a Node callback
  - examples:
    - `__H2O_LOG_EVENT`
    - `__remix_devServerHooks.getCriticalCss`
- `staticEnv`
  - values passed as bindings / env only
  - examples:
    - `HYDROGEN_PROJECT_ROOT`
    - CLI env vars

This keeps the environment API work focused and removes arbitrary stringified setup as the long-term contract.

## Recommended technical direction

### Use a fetchable environment for request dispatch

Use a fetchable environment wrapper for the `ssr` environment request path so consumers can forward backend requests through:

- `server.environments.ssr.dispatchFetch(request)`

This keeps the current HTTP behavior but replaces the ad hoc request path with an official environment contract.

Important implementation note:

- Keep Vite RC / proposal-specific code isolated behind one local wrapper.
- Do not spread `createFetchableDevEnvironment(...)` calls across the codebase.
- If Vite changes the fetchable API shape, only one file should need updates.

### Keep a custom evaluator in workerd

Do not try to switch workerd evaluation to the default Vite evaluator.

Retain the current `unsafeEvalBinding`-based evaluation strategy from `src/vite/worker-entry.ts`, but move the surrounding transport/protocol to the official environment runner primitives.

### Replace `/__vite_fetch_module` with an official runner transport

The `worker-entry.ts` runtime should stop talking to Vite through a custom HTTP endpoint dedicated to module fetches.

Instead:

- implement the Vite runner transport on the server side
- let workerd call the official transport contract
- keep the existing workerd-local `ModuleRunner` cache and evaluator

This should remove:

- `FETCH_MODULE_PATHNAME`
- the `/__vite_fetch_module` middleware
- the special-case "workerd asks Vite for modules" HTTP endpoint

### Keep HMR disabled in phase 1

Do not couple the first migration to runner-side HMR.

The first pass should preserve current behavior:

- workerd runner uses invalidation / re-fetch behavior
- no requirement for a full `send` + `connect` hot channel
- no migration of Hydrogen RPC onto `environment.hot`

Once the environment refactor is stable, a separate effort can decide whether to add a real hot channel for workerd.

## New internal modules

Add these modules under `packages/mini-oxygen/src/vite/`:

- `environment.ts`
  - defines `MiniOxygenDevEnvironment`
  - defines `isMiniOxygenDevEnvironment`
  - owns lazy runtime startup and disposal
- `environment-factory.ts`
  - creates the custom `ssr` environment config
  - isolates Vite Environment API details
- `runtime-options.ts`
  - shared types and runtime config store
- `runtime-bridge.ts`
  - typed registry for runtime scripts and RPC bridges
- `module-transport.ts`
  - server-side transport adapter between Vite and workerd
- `request-adapter.ts`
  - converts Node requests/responses to global `Request`/`Response`

Keep and refactor:

- `worker-entry.ts`
  - keep as the workerd bootstrap, but adapt it to the official runner transport
- `entry-error.ts`
  - keep current optimizeDeps guidance, but make it environment-aware

Reduce or delete:

- `server-middleware.ts`
  - delete module-fetch endpoint logic
  - keep only the thin "forward unmatched backend request to dispatchFetch" adapter if still needed

## Hydrogen and CLI integration plan

### Short-term compatibility

In the first pass, keep `registerPluginOptions(...)` as an internal compatibility shim so the environment refactor can land without touching Hydrogen and CLI in the same PR.

Implementation:

- both Hydrogen and `packages/cli/src/commands/hydrogen/dev.ts` can keep calling `findOxygenPlugin(config)?.api?.registerPluginOptions(...)`
- `oxygen().api.registerPluginOptions(...)` writes into a source-aware pending runtime config store
- the pending store must accept async CLI values such as `envPromise`
- `MiniOxygenDevEnvironment` consumes and normalizes that store when it is created
- MiniOxygen runtime startup must await required CLI-provided async values before booting workerd for the first request
- once the environment exists, updates should forward into `configureRuntime(...)`

This preserves current behavior while the runtime moves to Environment APIs.

### CLI option flow during the transition

The CLI currently injects MiniOxygen runtime options from `configResolved()` in `packages/cli/src/commands/hydrogen/dev.ts`. The phase-1 design should preserve that flow exactly, even before the environment instance becomes the primary integration point.

The compatibility path must continue to carry:

- `entry`
- `envPromise`
- `debug`
- `inspectorPort`
- `logRequestLine`
- `entryPointErrorHandler`

That means phase 1 needs a buffered runtime-config layer, not a server-only API:

- CLI can register options before `configureServer(server)` runs
- `MiniOxygenDevEnvironment` reads the buffered options when it is constructed
- if the CLI updates options after the environment exists, those updates forward to `configureRuntime(...)`
- if `envPromise` is still pending, runtime boot waits for it before creating MiniOxygen bindings

### Long-term target

After the environment exists, remove plugin-name lookup as the primary coordination mechanism.

Hydrogen and CLI should configure the custom environment instance directly in `configureServer(...)`.

#### Hydrogen plugin target

Replace this:

- `configResolved()`
- find plugin named `oxygen:main`
- call `oxygenPlugin.api.registerPluginOptions(...)`

With this:

- `configureServer(server)`
- access `server.environments.ssr`
- guard with `isMiniOxygenDevEnvironment(...)`
- call:
  - `configureRuntime({ compatibilityDate, env, requestHook })`
  - `registerRuntimeBridge(...)` for Hydrogen runtime hooks

#### CLI target

Replace the CLI-side `registerPluginOptions(...)` call with direct environment configuration in `configureServer(server)`:

- `entry`
- `envPromise` or resolved remote env vars
- `debug`
- `inspectorPort`
- `logRequestLine`
- `entryPointErrorHandler`

`configureRuntime(...)` should accept the same option shapes the CLI already owns, including unresolved `envPromise`, so moving from the shim to the environment instance does not require changing CLI behavior first.

This keeps framework/runtime coordination on the environment instance instead of plugin-name discovery.

## Replace `crossBoundarySetup` feature by feature

### Static env values

Current examples:

- `HYDROGEN_PROJECT_ROOT`
- CLI-provided env vars

Target:

- keep as normal environment bindings / runtime config
- no RPC needed

### Pure runtime bootstrap scripts

Current example:

- patch `Error.prototype.toString` in workerd

Target:

- move to `runtimeScripts`
- execute before importing the app entry
- no Node callback required

### Hydrogen subrequest event bridge

Current path:

- Hydrogen runtime code calls `globalThis.__H2O_LOG_EVENT`
- current `crossBoundarySetup` injects a function that round-trips to Node
- Node side calls `emitRequestEvent(...)`

Target:

- replace with a named RPC bridge
- install `globalThis.__H2O_LOG_EVENT = (payload) => bridge.call('h2o-log-event', payload)`
- Node side bridge handler forwards into `emitRequestEvent(...)`

Do not move this to `environment.hot` in phase 1.

### React Router / Remix critical CSS hook

Current path:

- workerd runtime expects `globalThis.__remix_devServerHooks.getCriticalCss`
- callback is forwarded to Node through wrapped bindings

Target:

- replace with a named RPC bridge
- install `globalThis.__remix_devServerHooks = { getCriticalCss: (...args) => bridge.call('remix-critical-css', args) }`
- Node side handler calls the real dev hook

### Generic bridge policy

Avoid a second generic "stringified setup function with arbitrary callback" abstraction.

Prefer a small typed bridge registry:

- `runtimeScripts`
- `rpcHandlers`
- `runtimeGlobals`

## Concrete phase plan

## Phase 0: Lock current behavior with integration tests

Before moving code, add real Vite dev-server tests. The package currently has unit/runtime coverage, but it does not fully lock the end-to-end Vite bridge.

Add tests that boot a Vite server with:

- `hydrogen()`
- `oxygen()`
- the React Router plugin

Cover:

- request reaches workerd, not Node SSR
- entrypoint module loading through Vite
- request logging still fires
- `__H2O_LOG_EVENT` subrequest logging still appears in the debug stream
- `getCriticalCss` callback still works
- redirect behavior remains manual
- streaming responses remain intact
- optimizeDeps error detection still shows actionable guidance

Deliverable:

- a failing test suite if the migration breaks real dev behavior

## Phase 1: Introduce `MiniOxygenDevEnvironment`

Implement the new environment wrapper while preserving the old plugin API.

Work:

- add `environment.ts`
- add runtime options store
- update `plugin.ts` to register/configure the custom `ssr` environment
- keep current `registerPluginOptions(...)` as a shim
- keep CLI option passing working through that shim, including async `envPromise`
- make the current request path call `server.environments.ssr.dispatchFetch(...)`

Do not remove the old module transport yet if that slows the first landing.

Deliverable:

- Vite dev requests flow through the new environment instance
- Hydrogen and CLI continue working unchanged

## Phase 2: Replace the ad hoc module-fetch transport

Move from `/__vite_fetch_module` to the official runner transport.

Work:

- add `module-transport.ts`
- refactor `worker-entry.ts` to use the official transport protocol
- remove `FETCH_MODULE_PATHNAME` and its middleware
- replace warmup with environment-aware warmup where possible

Deliverable:

- no custom Vite endpoint dedicated to module fetches
- workerd still evaluates transformed SSR modules with the current evaluator

## Phase 3: Replace `crossBoundarySetup` with typed bridges

Work:

- add `runtime-bridge.ts`
- port the error stack patch to `runtimeScripts`
- port `__H2O_LOG_EVENT` to RPC bridge
- port `__remix_devServerHooks.getCriticalCss` to RPC bridge
- keep backward compatibility path while Hydrogen and CLI migrate

Deliverable:

- no new code depends on `crossBoundarySetup`
- typed bridges are available for Hydrogen and CLI

## Phase 4: Move Hydrogen and CLI onto the environment instance

Work:

- update `packages/hydrogen/src/vite/plugin.ts`
  - stop finding `oxygen:main` in `configResolved()`
  - configure the environment directly in `configureServer(server)`
- update `packages/cli/src/commands/hydrogen/dev.ts`
  - stop calling `registerPluginOptions(...)`
  - configure the environment directly in `configureServer(server)`
- keep temporary fallback if the environment is not MiniOxygen-backed

Deliverable:

- no plugin-name coupling between Hydrogen/CLI and MiniOxygen during dev

## Phase 5: Build alignment

Move build-time behavior to environment-aware hooks where it improves clarity.

Work:

- move compatibility-date-driven output behavior to environment-aware build hooks where practical
- keep generating `oxygen.json`
- decide whether `sharedDuringBuild` / `builder.sharedConfigBuild` is useful for Hydrogen + MiniOxygen shared state
- ensure client + SSR output paths still match current expectations

Deliverable:

- build remains identical from the app point of view
- build hooks are environment-aware instead of `ssr`-boolean-oriented

## Phase 6: Delete compatibility shims

After Hydrogen and CLI have migrated:

- remove `registerPluginOptions(...)`
- remove generic `crossBoundarySetup`
- delete stale middleware code
- delete any leftover compatibility stores

Deliverable:

- the Vite integration is centered on environment instances, not plugin-name APIs

## File-by-file work list

### `packages/mini-oxygen/src/vite/plugin.ts`

- register or replace the `ssr` environment with MiniOxygen
- move worker/workerd defaults into `config` and `configEnvironment`
- keep compatibility shim in phase 1
- later delete the plugin API shim

### `packages/mini-oxygen/src/vite/server-middleware.ts`

- phase 1: reduce to thin HTTP adapter around `dispatchFetch`
- phase 2: remove `/__vite_fetch_module`
- phase 6: delete entirely if no custom fallback middleware remains necessary

### `packages/mini-oxygen/src/vite/worker-entry.ts`

- preserve custom evaluator
- replace custom module-fetch URL contract with official runner transport
- load typed runtime bridges before importing app entry

### `packages/hydrogen/src/vite/plugin.ts`

- move MiniOxygen integration from `configResolved` to `configureServer`
- install runtime config and bridges on the environment instance
- reduce reliance on plugin ordering and plugin-name lookup

### `packages/hydrogen/src/vite/hydrogen-middleware.ts`

- keep Node fallback when no MiniOxygen environment is present
- remove Oxygen-specific assumptions that are no longer needed once the environment instance is the integration point

### `packages/cli/src/commands/hydrogen/dev.ts`

- phase 1: keep the existing `registerPluginOptions(...)` path working as the CLI compatibility path
- make sure CLI-owned options map cleanly onto `MiniOxygenRuntimeOptions`, including async env resolution
- stop using `findOxygenPlugin(...).api.registerPluginOptions(...)`
- configure `server.environments.ssr` directly

### Tests

Add or expand tests in:

- `packages/mini-oxygen/src/vite/`
- `packages/hydrogen/src/vite/`
- CLI integration tests if needed

## Feature parity checklist

| Feature                                        | Keep as-is | Rework                                                 | Phase |
| ---------------------------------------------- | ---------- | ------------------------------------------------------ | ----- |
| SSR runs in workerd during dev                 | yes        | move Vite glue to environment APIs                     | 1     |
| request forwarding from Vite to workerd        | yes        | use `dispatchFetch` on custom environment              | 1     |
| transformed module execution in workerd        | yes        | keep custom evaluator, replace transport               | 2     |
| request logging / `requestHook`                | yes        | move config path to environment instance               | 1, 4  |
| Hydrogen subrequest profiler                   | yes        | replace generic setup with RPC bridge                  | 3     |
| React Router critical CSS dev hook             | yes        | replace generic setup with RPC bridge                  | 3     |
| redirect handling                              | yes        | keep in MiniOxygen runtime                             | 1     |
| streaming responses                            | yes        | keep in request adapter / runtime                      | 1     |
| entrypoint optimization error guidance         | yes        | keep existing logic, make environment-aware            | 1, 2  |
| inspector / debugger                           | yes        | keep in MiniOxygen runtime                             | 1     |
| compatibility date and `oxygen.json`           | yes        | move build-side config to env-aware hooks where useful | 5     |
| plugin-name lookup between Hydrogen and Oxygen | no         | replace with environment instance methods              | 4     |
| generic `crossBoundarySetup`                   | no         | replace with typed bridges                             | 3, 6  |

## Risks and mitigations

### Risk: fetchable environment API shape changes

Mitigation:

- isolate all fetchable-environment usage in one local wrapper
- do not leak Vite RC APIs into Hydrogen or CLI code

### Risk: global `Request` / `Response` validation

Mitigation:

- use global Web Fetch classes at the environment boundary
- convert to Miniflare request/response shapes only inside MiniOxygen runtime code

### Risk: Hydrogen RPC currently depends on generic callbacks

Mitigation:

- migrate one bridge at a time
- keep a compatibility layer until the environment-based bridge is stable

### Risk: HMR assumptions leak into the migration

Mitigation:

- treat workerd HMR as a separate project
- preserve current invalidation semantics first

### Risk: build behavior diverges from dev

Mitigation:

- keep the public build outputs identical
- delay build-side cleanup until after dev parity is proven

## Recommended implementation order

1. Add missing real Vite integration tests.
2. Introduce `MiniOxygenDevEnvironment` behind the existing plugin API.
3. Switch request dispatch to `server.environments.ssr.dispatchFetch(...)`.
4. Replace the custom module-fetch endpoint with the official runner transport.
5. Introduce typed runtime bridges.
6. Migrate Hydrogen to environment-instance methods.
7. Migrate CLI to environment-instance methods.
8. Align build hooks.
9. Delete compatibility shims.

## Success criteria

The refactor is complete when:

- `mini-oxygen` no longer depends on a custom `/__vite_fetch_module` endpoint.
- Hydrogen and CLI no longer need to find `oxygen:main` by plugin name.
- CLI-owned runtime options still reach MiniOxygen before the first SSR request.
- workerd SSR requests still flow through MiniOxygen in dev.
- subrequest logging and critical CSS callbacks still work.
- redirects, streaming, debugger support, and compatibility-date behavior are unchanged.
- the remaining custom code is clearly runtime-provider code, not Vite-integration scaffolding.
