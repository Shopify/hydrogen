---
name: create-oxygen-template
description: >
  Create, upgrade, or maintain the canonical source for the Oxygen-ready React Router template under templates/react-router.
  Use for a professional React Router starter with MiniOxygen/Vite dev setup, a Worker server entrypoint, env-driven
  configuration, Oxygen cache wiring, and no monorepo-only app imports or development plugins.
---

# Create Oxygen Template

## Goal

Maintain `templates/react-router` as the canonical source for a professional starter that runs on Oxygen/MiniOxygen through Vite. Keep the app decoupled from monorepo-only shared code and development-only plugins while using the workspace Hydrogen package for local integration coverage.

## Workflow

1. Work directly in `templates/react-router`; it is the source of truth for the starter.
   Keep generated and local artifacts out of the source template:
   - `node_modules/`
   - `.react-router/`, `build/`, `dist/`
   - `.env` (the template ships `.env.example` and a gitignored `.env`)
   - `*-graphql-env.d.ts`
   - package-manager lockfiles (ignored by the repository root)
   Keep lockfile ignores at the repository root rather than in the template's own `.gitignore`, so the distributed starter can commit its generated lockfile.
2. Preserve app features and route behavior unless the user explicitly asks to simplify.
3. Remove monorepo-only coupling:
   - no `@shared/*` imports
   - no `examples/shared/*` runtime dependency
   - no `localCdnAssets`
   - keep the Hydrogen local HTTPS Vite plugin and `dev:https` script, using its portable default certificate paths
   - no `@shopify/hydrogen-classic`
   - no Hydrogen Vite plugin from classic Hydrogen
   - no `@react-router/node`, `@react-router/serve`, or `react-router-serve` unless the template intentionally supports a Node server path
   - no `lru-cache` for Hydrogen primitives on Oxygen
   - no `catalog:` dependency ranges in the final template package
   - use `@shopify/hydrogen: workspace:*` in this repository so template E2E exercises the package under development
     (see "Hydrogen dependency" below). Do not use repo-local `file:` dependencies or vendored package tarballs.

Keep `lib/route-templates.ts` unchanged. It defines `routeTemplates` via `createShopifyRouteTemplates`, which is a REQUIRED arg on `handleShopifyRedirects`, `ShopifyScripts` (`routes` prop), and `getPredictiveSearchItemUrl` (`routes` option).

4. Add Oxygen/MiniOxygen support:
   - `@shopify/mini-oxygen`: pin `^4.2.0` — its `oxygen()` plugin adds `configurePreviewServer`, which `vite preview`
     needs to run the Worker.
   - `@shopify/oxygen-workers-types`
   - `@shopify/cli` only for the deploy script. Pin `4.6.0` (minimum `4.4.0`) because deploy must support the explicit `--assets-dir` and `--worker-dir` flags.
   - a Worker entrypoint, usually root `server.ts`
   - plain `oxygen()` in `vite.config.ts`. The plugin auto-loads `.env` into the Worker via its own `loadEnv` fallback
     when no env is provided (MiniOxygen >= 4.2.0).
5. Add the Workers SSR/client entries (REQUIRED once `@react-router/node` is removed, or `react-router typegen`/`build`
   fail with "Could not determine server runtime"):
   - `app/entry.server.tsx` using `renderToReadableStream` (Web streams; Oxygen-compatible)
   - `app/entry.client.tsx` using `HydratedRouter`
6. Treat Oxygen as a Worker runtime:
   - create request-scoped Shopify primitives inside the request path
   - pass `env`, `executionContext`, `waitUntil`, and cache through typed app context
   - avoid Node process/global assumptions in runtime code
7. Move any needed shared logic into template-local files, usually under `app/lib/`.
8. Update README and env files for a real starter project.
9. Run install/typecheck/build/dev/preview validation (see "Prerequisites" and "Validation").

Implementation details (exact per-file shape) live in [reference/react-router-pattern.md](reference/react-router-pattern.md) — read it when writing the template files.

## Prerequisites (do these before validating)

- **Use `CI=true` for installs** in this repo (installs abort without a TTY: `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`),
  and `--no-frozen-lockfile` on the first install after adding the template or changing dependencies.
- **Build the local Hydrogen package first**: `pnpm --filter @shopify/hydrogen build`. The source template consumes
  `@shopify/hydrogen: workspace:*`, so its runtime imports, packed TypeScript plugin, and schemas use the package built in this repository.

## Hydrogen dependency

Use the workspace package in this repository:

```json
"@shopify/hydrogen": "workspace:*"
```

This keeps the canonical template wired to the Hydrogen code under development, so repository builds and E2E tests
cover package and template changes together.

The source template is not the standalone distribution artifact. This repository's release flow replaces
`workspace:*` with the version selected by the `preview` dist-tag before generating the standalone lockfile. Preview
cuts use the `2026.10.0-preview.<n>` format and must resolve from the registry with an integrity hash.

Do not rely on `shopify hydrogen deploy` recognizing that version format. The template's deploy script passes
`--assets-dir dist/client --worker-dir dist/server`, which selects the template's `react-router build` output without
the CLI version sniff. The distributed package must still expose `./customer-account`, `./react`, and `./package.json`.

## React Router Template Pattern

The concrete, file-by-file shape (package.json, vite.config.ts, react-router.config.ts, server.ts, entry.server/client,
Worker lifecycle, Oxygen cache, env & types, shared-code migration) is in
**[reference/react-router-pattern.md](reference/react-router-pattern.md)** — read that file when implementing. These
instructions are specific to `templates/react-router`; do not generalize them to Next/Nuxt/Astro/Solid/SvelteKit
without adding framework-specific guidance first.

## Lockfile

The source template declares `"packageManager": "pnpm@10.33.0"` so local development uses the repository's package
manager and root lockfile. It does not commit a template lockfile; the root `.gitignore` keeps source-template
lockfiles out of this repository.

During distribution, the release flow changes the template to `"packageManager": "npm@11.17.0"`, replaces
`workspace:*` with the version selected by the `preview` dist-tag, and generates `package-lock.json`. Oxygen requires
that generated lockfile for `npm ci`. Verify its
`node_modules/@shopify/hydrogen` entry resolves to a registry tarball with an integrity hash, not a `link:`,
`workspace:`, or vendored `file:` entry. Independently verify the template deploy script includes
`--assets-dir dist/client --worker-dir dist/server`; the lockfile does not prove the CLI will use those outputs.

### `minimumReleaseAge` supply-chain policy (org environments)

Installs may fail with "The lockfile contains entries that the active policies reject" / "within the minimumReleaseAge
cutoff". This is an org pnpm policy that REJECTS (does not downgrade) dependencies published within a recent window
(~7 days). It is triggered by bleeding-edge transitive deps (e.g. `rolldown`, `caniuse-lite` pulled by very new Vite /
Tailwind), NOT by anything wrong in the template. Deleting the lockfile does not help. Options: pin the toolchain to
settled versions rather than the absolute latest; wait for the deps to age out; or, if the user approves, relax it for
one install with `pnpm install --config.minimumReleaseAge=0`. Note `pnpm run <script>` re-runs a deps check that
re-triggers the gate. Do not confuse this with `ERR_PNPM_NO_MATCHING_VERSION`, which means the pinned version simply
does not exist (verify with `npm view <pkg> version` before pinning).

## Skill Wiring

Keep `skills/create-oxygen-template` as the single source of truth. If exposing the skill through `.agents` or `.claude`, use symlinks such as:

```text
.agents/skills/create-oxygen-template -> ../../skills/create-oxygen-template
.claude/skills/create-oxygen-template -> ../../skills/create-oxygen-template
```

Do not maintain copied skill directories under `.agents` or `.claude`.

## README

Rewrite the README for a starter project, not for the monorepo example. Include:

- what the template is
- prerequisites
- required env vars and `.env` setup
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run deploy`
- a "Deploy to Oxygen" section with the one-click button (see "Deploy button")
- a brief note that it runs on Oxygen/MiniOxygen through Vite

Remove example-comparison tables, monorepo-only commands, and references to `examples/shared`.

### Deploy button

The README MUST lead with a **Deploy to Oxygen** button. It is the canonical one-click entry point for an Oxygen
starter; the manual `npm run deploy` (`shopify hydrogen deploy`) flow is a secondary fallback, not the primary path.
Add it in TWO places, using this exact markup (an absolute raw image URL pinned to the `preview` branch — the
template ships into users' repos, so it cannot rely on a relative path to the repo's `.github/images/` asset):

1. **At the very top of the README**, immediately under the `#` title line:

   ```html
   <a href="https://admin.shopify.com/hydrogen/new?template=react-router"><img alt="Deploy to Oxygen" src="https://raw.githubusercontent.com/Shopify/hydrogen/preview/.github/images/deploy-to-oxygen.svg" width="182" height="46"></a>
   ```

2. **In the "Deploy to Oxygen" section**, leading with the button and the one-click flow, then the manual
   `npm run deploy` fallback. Use this shape:

   ```markdown
   ## Deploy to Oxygen

   <a href="https://admin.shopify.com/hydrogen/new?template=react-router"><img alt="Deploy to Oxygen" src="https://raw.githubusercontent.com/Shopify/hydrogen/preview/.github/images/deploy-to-oxygen.svg" width="182" height="46"></a>

   The fastest way to deploy is the button above — it creates a new Oxygen project from this template and links it to your Shopify store.

   When you deploy from the command line with `npm run deploy`, a linked storefront injects your env vars (`PUBLIC_STORE_DOMAIN`, `PRIVATE_STOREFRONT_API_TOKEN`, `SESSION_SECRET`) automatically, so the deployed site connects to your store with no extra config.
   ```

The button's `template=react-router` query param and the image URL's `preview` branch path are fixed — keep them
exactly. Do NOT swap the image `src` for a relative path to a local `.github/images/` file: the template is cloned
into the user's own repo, which does not contain that asset. (The SVG itself lives at
`.github/images/deploy-to-oxygen.svg` in the `Shopify/hydrogen` repo on `preview`; the absolute raw URL references it
in place, so the template does not need to ship a copy.)

## Validation

Before finishing:

1. Install with `CI=true` (see Prerequisites).
2. Run `rg -n "@shared/|examples/shared|localCdnAssets|localHttps|hydrogen-classic|@react-router/node|@react-router/serve|lru-cache|catalog:|process\\.env|file:./shopify-hydrogen" templates/<name> -g '!pnpm-lock.yaml' -g '!package-lock.json' -g '!node_modules'`. Exclude `pnpm-lock.yaml`, `package-lock.json`, and `node_modules` — lockfiles can legitimately list transitive `@react-router/node`, `@react-router/serve`, and `lru-cache` even after the template drops them as direct deps; scanning them produces false positives.
3. Run the template typecheck (`react-router typegen && tsc --noEmit && hydrogen gql check --fail-on-warn`).
4. Run the template build. Confirm it creates `dist/client`, `dist/server`, and `dist/server/index.js`.
5. Run `node_modules/.bin/shopify hydrogen deploy --help` from the template directory. Confirm it lists
   `--assets-dir` and `--worker-dir`. A deploy with fake credentials must get past flag parsing and fail on
   authentication instead of reporting `Nonexistent flags`.
6. **Actually drive both runtimes, don't just check that a server starts** (static assets can serve even when the Worker isn't exercised):
   - `npm run dev`: request `/`, a product, a collection, `/search`, `/account`, `/cart` — expect HTTP 200 and live data.
   - `npm run preview` (= `react-router build && vite preview`, requires MiniOxygen `>= 4.2.0`): same requests through the built Worker. Confirm `.env` is loaded (root routes need real env, or they 500).
7. For distribution validation, copy the template to a temporary directory, replace `workspace:*` with the version
   selected by the `preview` dist-tag, generate `package-lock.json`, and verify Hydrogen resolves to a registry tarball
   with integrity. Leave the source template lockfile-free.
8. Report any validation not run and why (e.g. an org `minimumReleaseAge` policy blocked install — that is an environment gate, not a template defect).

Expected local noise / environment gotchas (do not treat as template bugs):

- **`envFile` deprecation warnings** ("The `envFile` option is deprecated, please use `envDir: false`") repeat during dev/typecheck from the React Router + MiniOxygen interaction. Harmless — ignore unless the plugins change.
- **macOS binary authorization (e.g. Shopify Santa) can block the `workerd` binary** that MiniOxygen downloads, so `npm run dev`/`npm run preview` reach "Vite ready" and then crash with `write EPIPE`. If dev/preview die that way, verify `workerd` is approved locally before assuming the template is broken.
