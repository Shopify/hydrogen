---
name: create-vercel-template
description: >
  Convert the Next.js example into a standalone Vercel-ready template under templates/nextjs, or repeat that
  Next.js-specific workflow for closely related examples. Use when asked to create, upgrade, or maintain a professional
  Next.js App Router storefront starter that deploys to Vercel, with env-driven secrets, local config, and removal of
  example-only shared or development dependencies.
---

# Create Vercel Template

## Goal

Create a standalone Next.js (App Router) template from `examples/nextjs` that deploys to Vercel, keeps the example's app behavior, and does not rely on monorepo-only shared code or development-only plugins.

Next.js on Vercel runs on the Node/Edge serverless runtime, so `process.env` works and there is no worker entrypoint, Vite plugin, or SSR/client entry rework. The Storefront cache uses Vercel's Runtime Cache (`@vercel/functions`) instead of an in-memory cache. The core work is decoupling from `@shared/*` and fixing a few deps/config lines.

## Workflow

1. Copy `examples/nextjs` to `templates/nextjs` unless the user names a closely related Next.js source.
   Do NOT copy build/generated/local artifacts — exclude them at copy time (e.g. `rsync -a --exclude ...`):
   - `node_modules/`, `.next/`, `.turbo/` (deps + build output)
   - `.env` (may contain a real decrypted secret — the template ships `.env.example` + a fresh gitignored `.env`)
   - `*-graphql-env.d.ts`, `tsconfig.tsbuildinfo` (generated)
   Then ensure the template `.gitignore` covers all of the above (and `.vercel`).
2. Preserve app features and route behavior unless the user explicitly asks to simplify.
3. Remove example-only coupling:
   - no `@shared/*` imports
   - no `examples/shared/*` runtime dependency
   - no `localCdnAssets` (drop the turbopack rule from `next.config.ts`)
   - no local-HTTPS dev script (the `https:dev` script points at `../../.cert`)
   - no `catalog:` dependency ranges in the final template package
   - `@shopify/hydrogen` is the exception to "no `workspace:*`": there is no published version with the required Hydrogen
     APIs, so keep it repo-local (see "Hydrogen dependency"). A published semver resolves to classic Hydrogen and the build fails.
   - Replace the in-memory `lru-cache` adapter with Vercel's Runtime Cache: remove `lru-cache` + the shared
     storefront-cache adapter, add `@vercel/functions`, and pass `getCache()` as the Storefront client's `cache`. An
     in-memory LRU is per-instance and ephemeral on serverless (near-useless across invocations). See "Caching".
4. Move shared logic into template-local files under `app/lib/` (see "Shared code migration").
5. Fix `package.json`, `next.config.ts`, and `tsconfig.json` (see "Config").
6. Env: read secrets from `process.env`; keep public identity bundled in `app/lib/config.ts` (see "Env and config").
7. Update README and env files for a Vercel starter.
8. Build the local Hydrogen package, then run typecheck/build/dev validation (see "Prerequisites" and "Validation").

## Prerequisites (do these before validating)

- **Build the local Hydrogen package first**: `pnpm --filter @shopify/hydrogen build`. The workspace package ships no
  `dist/` until built; runtime imports, the packed TypeScript plugin, and its schemas depend on that build.
- **Use `CI=true` for installs** in this repo (installs abort without a TTY), and `--no-frozen-lockfile` on the first
  install after adding the template.

## Hydrogen dependency

The example uses the unpublished dev-preview `@shopify/hydrogen` APIs (`createShopifyRequestContext`,
`createStorefrontClient`, `createCartServerHandlers`, `ShopifyScripts`, the `/customer-account` + `/react` subpaths,
etc.). No published version (`latest`, `preview`, `next`) exposes this full surface — the published `preview` tarball is
missing `./customer-account`. So the template must depend on the repo-local package. Pick ONE mechanism:

1. `@shopify/hydrogen: workspace:*` **and** add `templates/*` to the root `pnpm-workspace.yaml` (like Hydrogen's
   `skeleton`). Simple, but pulls the template into the root workspace.
2. `@shopify/hydrogen: file:../../packages/hydrogen` **and** a template-local `pnpm-workspace.yaml` (`packages: []`,
   plus `allowBuilds` for the native deps that run postinstall build scripts — for the Next.js template these are
   `sharp` and `unrs-resolver`). Fully standalone; does not disturb the root workspace. Prefer this when the root
   workspace must stay untouched or another template already lives under `templates/`.

Either way the package must be built first. A truly publishable standalone lockfile is only possible after a matching
`@shopify/hydrogen` is published — treat it as a post-publish step, not a blocker for a working in-repo template.

## Config

### package.json

- Rename to `@shopify/hydrogen-template-nextjs`.
- Keep `next`, `react`, `react-dom`, `@shopify/hydrogen` (repo-local), `tailwindcss` /
  `@tailwindcss/postcss`, `eslint`, `eslint-config-next`.
- Remove `lru-cache`; add `@vercel/functions` (Vercel Runtime Cache; see "Caching"). **Do not pin to npm's
  `latest`** — this org's package proxy lags npm, so an install of `^<npm-latest>` fails with `ERR_PNPM_NO_MATCHING_VERSION` (no version in the proxy satisfies the range). Check the proxy-visible version first (`pnpm view @vercel/functions version`) and pin a patch or two below (e.g. `^3.7.4`). Separately, the org `minimumReleaseAge` policy (see below) can reject too-new transitive deps even when the version exists — a different failure ("within the minimumReleaseAge cutoff"), same pin-below remediation.
- Replace `typescript: catalog:` with a real npm range (e.g. `^5.9.3`).
- Remove the `https:dev` script (it references `../../.cert`). Keep `dev`, `build`, `start`, `lint`, `typecheck`.
- Deploy uses the Vercel CLI, not a build dependency: document `npx vercel` / `npx vercel --prod` (optionally add a
  `"deploy": "vercel --prod"` script and tell the user to have the Vercel CLI available).

### next.config.ts

Drop the shared CDN turbopack rule, and pin the Turbopack workspace root to the template dir. With a template-local
`pnpm-workspace.yaml` (mechanism #2), Next sees more than one lockfile and warns it "inferred your workspace root"
(selecting the repo root) — which can make Turbopack resolve modules from the wrong root. `root: __dirname` silences it
and keeps resolution local (`__dirname` works inside `next.config.ts`):

```ts
import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
```

### tsconfig.json

Remove the `@shared/*` path (keep `@/*`). Keep the `@shopify/hydrogen/ts-plugin` and `next` plugin entries. Leave the rest of Next's config as-is.

## Env and config

Next.js server code and middleware read secrets from `process.env`. Add a template-local `app/lib/env.ts`:

```ts
const SESSION_SECRET_MIN_LENGTH = 32;

// Do NOT throw on a missing token: the getter runs during `next build` page-data
// collection, and a starter must build before secrets are set. Return "" and let
// the Storefront API surface an auth error at request time instead of crashing.
export function getPrivateStorefrontToken(): string {
  return process.env.PRIVATE_STOREFRONT_API_TOKEN ?? "";
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < SESSION_SECRET_MIN_LENGTH) {
    throw new Error(`SESSION_SECRET is required and must be at least ${SESSION_SECRET_MIN_LENGTH} characters long.`);
  }
  return secret;
}
```

Do not add `import "server-only"` to `env.ts`: `proxy.ts` (Next.js middleware) imports these getters, and
middleware is not a React Server Component boundary, so `server-only` would break the build there.

**Config split (public vs secret).** There are two kinds of config, and the split maps onto Next's two env-var kinds:

- **Public identity -> `app/lib/config.ts`, each value from a `NEXT_PUBLIC_*` env var. Do NOT hardcode any token/ID/domain
  values in the source — fall back to an empty string when the env var is absent.** Store domain, public Storefront token,
  shop ID, storefront ID, Customer Account client ID. These are non-secret and read on the CLIENT (`ShopifyScripts`,
  analytics), so they MUST be `NEXT_PUBLIC_`-prefixed — Next inlines `NEXT_PUBLIC_*` into the client bundle at build time;
  a bare `process.env.FOO` would be `undefined` on the client. Never throw on a missing value (the template must still
  `next build` with nothing set). Pattern:

  ```ts
  export const storefrontConfig = {
    storeDomain: process.env.NEXT_PUBLIC_STORE_DOMAIN || "",
    publicStorefrontToken: process.env.NEXT_PUBLIC_STOREFRONT_API_TOKEN || "",
  };
  export const customerAccountConfig = {
    shopId: process.env.NEXT_PUBLIC_SHOP_ID || "",
    customerAccountApiClientId: process.env.NEXT_PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID || "",
  };
  const publicStorefrontId = process.env.NEXT_PUBLIC_STOREFRONT_ID || "";
  // defaultI18n, shop, analyticsShop, analyticsConsent derive from the above.
  ```

  The store identity lives entirely in env vars — none of it is baked into source. Because `storeDomain` comes from
  `NEXT_PUBLIC_STORE_DOMAIN` here, do NOT also add a server-only `getStoreDomain`/`PUBLIC_STORE_DOMAIN` override in
  `env.ts` — use `storefrontConfig.storeDomain` directly in `storefront.ts` and `proxy.ts` (one source of truth).

- **Real secrets -> `env.ts`, read on the server only** from NON-public env vars: `SESSION_SECRET`,
  `PRIVATE_STOREFRONT_API_TOKEN`. Do NOT prefix these with `NEXT_PUBLIC_` (that would leak them into the client bundle).

Ship a committed `.env.example` and a gitignored `.env`. Secrets required; the `NEXT_PUBLIC_*` identity all optional
(unset -> empty config, so the storefront won't resolve until they're set). To run against Shopify's public
`hydrogen-preview` demo store, fill the `NEXT_PUBLIC_*` values with the demo store's public identity (see
`examples/shared/config.ts`) rather than hardcoding it in `config.ts`:

```sh
# Secrets (required, server-only — no NEXT_PUBLIC_ prefix)
SESSION_SECRET="replace-with-a-long-random-secret-32+"
PRIVATE_STOREFRONT_API_TOKEN=""

# Public storefront identity (fill these to point at a store; empty -> storefront won't resolve)
NEXT_PUBLIC_STORE_DOMAIN=""
NEXT_PUBLIC_STOREFRONT_API_TOKEN=""
NEXT_PUBLIC_SHOP_ID=""
NEXT_PUBLIC_STOREFRONT_ID=""
NEXT_PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=""
```

To smoke-test against the demo store in this repo, obtain a real `PRIVATE_STOREFRONT_API_TOKEN` with
`node scripts/decrypt-example-secrets.ts` (needs the ejson key locally). It may exit non-zero if an unrelated example
fails, but it still writes `examples/nextjs/.env` — read `PRIVATE_STOREFRONT_API_TOKEN` from there (same key name the
template expects) and copy it into the template `.env`.

## Shared code migration

Replace each `@shared/*` import with template-local code, then fix the import paths in the files that used them
(`proxy.ts`, `app/lib/storefront.ts`, `app/lib/customer-account.ts`, `app/lib/analytics.ts`, `app/layout.tsx`,
`app/components/Header.tsx`):

- `@shared/config` -> `app/lib/config.ts` (public identity, each value from a `NEXT_PUBLIC_*` env var, empty-string
  fallback, no hardcoded credentials; see config split). Drop `sessionSecret` from `customerAccountConfig` — the session
  secret now comes from `getSessionSecret()`.
- `@shared/private-env` -> `app/lib/env.ts` (`process.env`-based; above).
- `@shared/buyer-ip` -> `app/lib/buyer-ip.ts`. Trim it to Vercel's reality: the client IP arrives only via
  `x-forwarded-for` (take the first entry), so drop the Oxygen (`oxygen-buyer-ip`) and Cloudflare (`cf-connecting-ip`)
  headers. Keep the `process.env.NODE_ENV !== "production"` localhost fallback.
- `@shared/header` -> `app/lib/header.ts` (`HEADER_COLLECTIONS_QUERY`, `normalizeHeaderCollections`, `HeaderCollection`).
- `@shared/storefront-cache` -> do NOT copy. In `app/lib/storefront.ts` and `proxy.ts`, pass Vercel's Runtime Cache
  (`getCache()`) as the `cache` on `createStorefrontClient`'s config instead of the LRU adapter (see "Caching").
- `@shared/customer-session` -> `app/lib/customer-session.ts` (copy; Web-Crypto based, works on Edge and Node). Update
  `createCustomerSessionManager` to key the cookie with `getSessionSecret()` instead of `customerAccountConfig.sessionSecret`.

Keep Customer Account, cart, search, and analytics features unless the user explicitly asks to remove them.

Additionally, keep `lib/route-templates.ts` unchanged — it is not `@shared/*`. `routeTemplates` is required by `handleShopifyRedirects({routeTemplates})` (in `app/not-found.tsx`), `<ShopifyScripts routes={routeTemplates}>` (in `components/ShopifyScriptsClient.tsx`), and `getPredictiveSearchItemUrl(product, {routes: routeTemplates, …})` (in `components/PredictiveSearchModal.tsx`).

## Caching

Do not ship an in-memory LRU cache — on Vercel each serverless/edge invocation can be a fresh instance, so a
per-process cache rarely hits. Use Vercel's durable Runtime Cache from `@vercel/functions` instead. Remove `lru-cache`
and the shared adapter, add `@vercel/functions`, and pass `getCache()` straight to `createStorefrontClient` as `cache`:

```ts
import {getCache, waitUntil} from "@vercel/functions";
import {createShopifyRequestContext, createStorefrontClient} from "@shopify/hydrogen";

// Create the cache in the request path (proxy.ts and the cache()-wrapped
// getStorefrontClient), not at module scope.
const cache = getCache();
const buyerIp = getBuyerIp(requestHeaders);

const requestContext = createShopifyRequestContext({
  request: {headers: requestHeaders},
  i18n,
  buyerIp,
});

createStorefrontClient({
  type: "private",
  requestContext,
  config: {
    storeDomain,
    privateStorefrontToken: getPrivateStorefrontToken(),
    buyerIp,
    cache,
    waitUntil,
  },
});
```

`getCache()` returns a key-value cache (get/set/delete) that satisfies the client's `cache` option
(`CacheInstance = WebCacheLike | KeyValueCacheLike`), backed by Vercel's Runtime Cache (shared across invocations,
unlike an in-process LRU). `waitUntil`, also from `@vercel/functions`, lets cache writes finish in the background after
the response is sent — pass it alongside `cache`.

This replaces only the storefront fetch cache. Under `cacheComponents: true`, the example's `app/layout.tsx` is a static shell wrapping the per-request `AppShell` (cart seed + chrome) in `<Suspense>`; `AppShell` calls `connection()` for dynamic request data. Route-segment configs like `export const dynamic`/`fetchCache`/`revalidate` are NOT used — they're replaced by `use cache`/`cacheLife` and are rejected under cache components. Do not re-add them.

Verify the app still renders live data after the swap (see "Validation").

## Vercel deployment

- Vercel auto-detects Next.js — no adapter or special build config needed. Deploy via the Git integration or the CLI
  (`npx vercel` for a preview, `npx vercel --prod` for production).
- Set environment variables in Vercel Project Settings -> Environment Variables. Secrets (server-only, no
  `NEXT_PUBLIC_` prefix): `SESSION_SECRET`, `PRIVATE_STOREFRONT_API_TOKEN`. Optional public identity overrides
  (`NEXT_PUBLIC_*`, e.g. `NEXT_PUBLIC_STORE_DOMAIN`) if not using the demo-store defaults baked into `app/lib/config.ts`.
- `proxy.ts` is Next.js middleware and runs on Vercel. Its LRU cache is per-instance/ephemeral on serverless (fine for
  a starter). If a request touches the Storefront API and env vars are missing, expect a 500 — set the env vars first.

## Lockfile

A truly standalone `pnpm-lock.yaml` (as if the template lived outside the monorepo) is NOT achievable while
`@shopify/hydrogen` is repo-local: `pnpm install --lockfile-only` fails with `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` (for
`workspace:*`) or an unresolvable `file:` path. Treat a publishable standalone lockfile as a post-publish step.

What to do instead, per mechanism (from "Hydrogen dependency"):

- `workspace:*` + `templates/*` in the root workspace: the template is covered by the root `pnpm-lock.yaml`; run
  `CI=true pnpm install --no-frozen-lockfile` at the repo root once to add it.
- `file:../../packages/hydrogen` + template-local `pnpm-workspace.yaml`: run `CI=true pnpm install` inside the template.
  Build `@shopify/hydrogen` first.

### `minimumReleaseAge` supply-chain policy (org environments)

Installs may fail with "The lockfile contains entries that the active policies reject" / "within the minimumReleaseAge
cutoff". This is an org pnpm policy that REJECTS (does not downgrade) dependencies published within a recent window,
triggered by bleeding-edge transitive deps, NOT by anything wrong in the template. Options: pin the toolchain to settled
versions; wait for the deps to age out; or, if the user approves, relax it for one install with
`pnpm install --config.minimumReleaseAge=0`. `pnpm run <script>` re-runs a deps check that re-triggers the gate.

## Skill Wiring

Keep `skills/create-vercel-template` as the single source of truth. If exposing the skill through `.agents` or
`.claude`, use symlinks (matching the other skills):

```text
.agents/skills/create-vercel-template -> ../../skills/create-vercel-template
.claude/skills/create-vercel-template -> ../../skills/create-vercel-template
```

Do not maintain copied skill directories under `.agents` or `.claude`.

## README

Rewrite the README for a Vercel Next.js starter, not the monorepo example. Include: what it is; prerequisites; env-var
setup split into the two required server-only secrets (`SESSION_SECRET`, `PRIVATE_STOREFRONT_API_TOKEN`) and the
optional `NEXT_PUBLIC_*` public-identity values (empty until set — fill with a store's public identity, e.g. the
`hydrogen-preview` demo values, to resolve the storefront); `pnpm install` / `pnpm dev` /
`pnpm build` / `pnpm start`; a "Deploy to Vercel" section with the one-click button (see "Deploy button"); and a note
that it targets Vercel and reads secrets from environment variables. Remove example-comparison tables, monorepo-only
commands, `examples/shared` references, and the example's `AGENTS.md`/`CLAUDE.md`.

### Deploy button

The README MUST lead with a **Deploy with Vercel** button. Vercel's deploy button is the canonical one-click entry
point for a Next.js starter; the manual `npx vercel` flow is a secondary fallback, not the primary path. Add it in
TWO places, using this exact markup (URL-encode the `repository-url` — the `%2F` escapes are required, matching
shopify-dev):

1. **At the very top of the README**, immediately under the `#` title line:

   ```markdown
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShopify%2Fhydrogen%2Ftree%2Fpreview%2Ftemplates%2Fnextjs)
   ```

2. **In the "Deploy to Vercel" section**, leading with the button and the one-click flow, then a short manual
   fallback. Use this shape:

   ```markdown
   ## Deploy to Vercel

   The fastest path is one click:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShopify%2Fhydrogen%2Ftree%2Fpreview%2Ftemplates%2Fnextjs)

   1. Click **Deploy with Vercel** above. Vercel clones this template into a new repository on your own Git provider (GitHub, GitLab, or Bitbucket).
   2. Keep the auto-detected Next.js settings (`next build`; no `vercel.json` needed).
   3. Deploy. The first build renders immediately with no environment variables, because the storefront falls back to `mock.shop`.
   4. Connect your store: add the env vars (see "Environment variables") under **Project Settings → Environment Variables**, then redeploy.

   Prefer to wire it up yourself? Push this project to a Git provider, import it in Vercel, keep the detected Next.js settings, and deploy — the same auto-detection and `mock.shop` fallback apply.
   ```

The button's `repository-url` points at `templates/nextjs` on the **`preview`** branch of `Shopify/hydrogen`. Keep
that exact branch/path — it is what the one-click deploy clones. (If a future published template moves to `main`,
update the URL then; do not point it at the repo root, which is not a deployable Next.js project.)

## Validation

Before finishing:

1. Build the local Hydrogen package: `pnpm --filter @shopify/hydrogen build`.
2. Install with `CI=true`.
3. Run `rg -n "@shared/|examples/shared|localCdnAssets|localHttps|lru-cache|catalog:" templates/<name> -g '!pnpm-lock.yaml' -g '!node_modules'` — expect no matches. (`process.env` is expected in Next.js server/middleware, so it is not in the pattern.)
4. Run the template typecheck (`tsc --noEmit && hydrogen gql check --fail-on-warn`). Note: the GraphQL check passes without
   emitting the `*-graphql-env.d.ts` files on disk (they're gitignored, generated on demand) — that is expected.
5. Run `next build`. Expect no "inferred your workspace root / multiple lockfiles" warning once `turbopack.root` is set.
6. **Actually drive the app, don't just check that it starts:** `next dev` (or `next start` after a build) and request
   `/`, a product, a collection, `/search`, `/account`, `/cart` — expect HTTP 200 and live data. Confirm `.env` is loaded.
   There is no `curl` in some environments — Node's global `fetch` works. To get a valid product/collection handle for
   the demo store, scrape `href="/products/..."` / `href="/collections/..."` from `/` or a collection page (guessing
   handles 404s); e.g. `v2-snowboard` and the `freestyle` collection are live. `/account` legitimately 307-redirects to
   `/account/refresh?...` when logged out — that is the Customer Account flow, not a failure.
7. **Check the output isn't gitignored:** run `git check-ignore templates/<name>` — if the whole `templates/` dir is
   ignored (a bare `templates` line in the repo root `.gitignore`), the template can't be committed. Surface this to the
   user rather than shipping an untrackable template.
8. Report any validation not run and why. A real Vercel deploy needs a Vercel account/login; local `next build` +
   `next start` is the closest offline proxy, plus `npx vercel build` if the CLI is available.
