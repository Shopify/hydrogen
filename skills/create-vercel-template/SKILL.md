---
name: create-vercel-template
description: >
  Create, upgrade, or maintain the canonical source for the Vercel-ready Next.js template under templates/nextjs. Use for a
  professional Next.js App Router storefront starter that deploys to Vercel, with env-driven secrets, local config,
  and no monorepo-only app imports or development plugins.
---

# Create Vercel Template

## Goal

Maintain `templates/nextjs` as the canonical source for a Next.js App Router starter that deploys to Vercel. Keep the app decoupled from monorepo-only shared code and development-only plugins while using the workspace Hydrogen package for local integration coverage.

Next.js on Vercel runs on the Node/serverless runtime, so `process.env` works and there is no worker entrypoint, Vite plugin, or SSR/client entry rework. The core work is decoupling from `@shared/*`, preserving the example behavior, and fixing deps/config/docs for a standalone starter.

## Workflow

1. Work directly in `templates/nextjs`; it is the source of truth for the starter.
   Keep generated and local artifacts out of the source template:
   - `node_modules/`, `.next/`, `.turbo/`
   - `.env` (the template ships `.env.example` and a gitignored `.env`)
   - `*-graphql-env.d.ts`, `tsconfig.tsbuildinfo`
   - package-manager lockfiles (ignored by the repository root)
   Keep lockfile ignores at the repository root rather than in the template's own `.gitignore`, so the distributed starter can commit its generated lockfile.
2. Preserve app features and route behavior unless the user explicitly asks to simplify.
3. Remove monorepo-only coupling:
   - no `@shared/*` imports
   - no `examples/shared/*` runtime dependency
   - no `localCdnAssets` (drop the turbopack rule from `next.config.ts`)
   - keep the Next.js `dev:https` script for local Customer Account OAuth
   - no `catalog:` dependency ranges in the final template package
   - use `@shopify/hydrogen: workspace:*` in this repository so template E2E exercises the package under development
     (see "Hydrogen dependency" below). Do not use repo-local `file:` dependencies or vendored package tarballs.
4. Move shared logic into template-local files under root `lib/` (see "Shared code migration").
5. Fix `package.json`, `next.config.ts`, and `tsconfig.json` (see "Config").
6. Env: read secrets from `process.env`; keep public identity in `lib/config.ts` using `NEXT_PUBLIC_*` values (see "Env and config").
7. Update README and env files for a Vercel starter.
8. Run install/typecheck/build/dev validation (see "Prerequisites" and "Validation").

## Prerequisites (do these before validating)

- **Use `CI=true` for installs** in this repo (installs abort without a TTY), and `--no-frozen-lockfile` on the first
  install after adding or changing the template.
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
`workspace:*` with the published preview version before generating the standalone lockfile. The distributed package
must expose the template's required APIs, subpaths, TypeScript plugin, and schemas.

## Config

### package.json

- Rename to `@shopify/hydrogen-template-nextjs`.
- Keep `next`, `react`, `react-dom`, `@shopify/hydrogen` (`workspace:*`), `tailwindcss` /
  `@tailwindcss/postcss`, `eslint`, `eslint-config-next`.
- Keep `"packageManager": "pnpm@10.33.0"` so the eventual standalone distribution uses the intended manager.
- Do not add `@vercel/functions` unless the app reintroduces an explicit Storefront cache adapter; the current Next template uses Next Cache Components (`"use cache"`, `cacheLife`, `cacheTag`).
- Replace `typescript: catalog:` with a real npm range (e.g. `^5.9.3`).
- Keep the `dev:https` script alongside `dev`, `build`, `start`, `lint`, and `typecheck`.
- Deploy uses the Vercel CLI, not a build dependency: document `npx vercel` / `npx vercel --prod` (optionally add a
  `"deploy": "vercel --prod"` script and tell the user to have the Vercel CLI available).

### next.config.ts

Drop the shared CDN Turbopack rule and keep Cache Components enabled. Do not pin `turbopack.root` in the source
template: its pnpm links resolve through the repository workspace outside `templates/nextjs`. The compiled template
installs standalone with its own lockfile, so Next infers the project directory there.

```ts
import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

### tsconfig.json

Remove the `@shared/*` path (keep `@/*`). Keep the `@shopify/hydrogen/ts-plugin` and `next` plugin entries. Leave the rest of Next's config as-is.

## Env and config

Next.js server code and middleware read secrets from `process.env`. Add a template-local `lib/env.ts`:

```ts
const SESSION_SECRET_MIN_LENGTH = 32;

export function getOptionalPrivateStorefrontToken(): string | undefined {
  const token = process.env.PRIVATE_STOREFRONT_API_TOKEN;
  return token && token.length > 0 ? token : undefined;
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

- **Public identity -> `lib/config.ts`, each value from a `NEXT_PUBLIC_*` env var. Do NOT hardcode any token/ID/domain
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

  The store identity lives entirely in env vars — none of it is baked into source. `NEXT_PUBLIC_STORE_DOMAIN` is required
  only when `PRIVATE_STOREFRONT_API_TOKEN` is set; with no private token, the resolver falls back to `mock.shop`.

- **Real secrets -> `env.ts`, read on the server only** from NON-public env vars: `SESSION_SECRET`,
  `PRIVATE_STOREFRONT_API_TOKEN`, and `SITE_ORIGIN`. Do NOT prefix these with `NEXT_PUBLIC_`.

Ship a committed `.env.example` and a gitignored `.env`. No env vars are required for the mock.shop fallback. For real-store mode, set `PRIVATE_STOREFRONT_API_TOKEN` and `NEXT_PUBLIC_STORE_DOMAIN`; set `SESSION_SECRET`, `SITE_ORIGIN`, `NEXT_PUBLIC_SHOP_ID`, and `NEXT_PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` to enable Customer Accounts.

```sh
# Server-only values — no NEXT_PUBLIC_ prefix
SESSION_SECRET=""
PRIVATE_STOREFRONT_API_TOKEN=""
SITE_ORIGIN="http://localhost:3000"

# Public storefront identity for real-store mode
NEXT_PUBLIC_STORE_DOMAIN=""
NEXT_PUBLIC_STOREFRONT_API_TOKEN=""
NEXT_PUBLIC_SHOP_ID=""
NEXT_PUBLIC_STOREFRONT_ID=""
NEXT_PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=""
```

To smoke-test against the demo store in this repo, run `pnpm run examples:secrets:decrypt` from the repository root
(needs the ejson key locally). It writes a gitignored `templates/nextjs/.env` containing the private token, public
store identity, and local Customer Account session configuration required by the template.

## Shared code migration

Replace each `@shared/*` import with template-local code, then fix the import paths in the files that used them
(`proxy.ts`, `lib/storefront.ts`, `lib/customer-account.ts`, `lib/analytics.ts`, `app/layout.tsx`,
`components/Header.tsx`):

- `@shared/config` -> `lib/config.ts` (public identity, each value from a `NEXT_PUBLIC_*` env var, empty-string
  fallback, no hardcoded credentials; see config split). Drop `sessionSecret` from `customerAccountConfig` — the session
  secret now comes from `getSessionSecret()`.
- `@shared/private-env` -> `lib/env.ts` (`process.env`-based; above).
- `@shared/buyer-ip` -> `lib/buyer-ip.ts`. Trim it to Vercel's reality: the client IP arrives only via
  `x-forwarded-for` (take the first entry), so drop the Oxygen (`oxygen-buyer-ip`) and Cloudflare (`cf-connecting-ip`)
  headers. Keep the `process.env.NODE_ENV !== "production"` localhost fallback.
- `@shared/customer-session` -> `lib/customer-session.ts` (copy; Web-Crypto based, works on Edge and Node). Update
  `createCustomerSessionManager` to key the cookie with `getSessionSecret()` instead of `customerAccountConfig.sessionSecret`.

Keep Customer Account, cart, search, and analytics features unless the user explicitly asks to remove them.

Additionally, keep `lib/route-templates.ts` unchanged — it is not `@shared/*`. `routeTemplates` is required by `handleShopifyRedirects({routeTemplates})` (in `app/not-found.tsx`), `<ShopifyScripts routes={routeTemplates}>` (in `components/ShopifyScriptsClient.tsx`), and `getPredictiveSearchItemUrl(product, {routes: routeTemplates, …})` (in `components/PredictiveSearchModal.tsx`).

## Caching

Do not ship an in-memory LRU cache. The current template uses Next-native cache points: `"use cache"`, `cacheLife`, and `cacheTag`. Under `cacheComponents: true`, `app/layout.tsx` is a static shell wrapping the per-request `AppShell` (cart seed + chrome) in `<Suspense>`; `AppShell` calls `connection()` for dynamic request data. Route-segment configs like `export const dynamic`/`fetchCache`/`revalidate` are NOT used because Cache Components rejects them.

Verify the app still renders live data after the swap (see "Validation").

## Vercel deployment

- Vercel auto-detects Next.js — no adapter or special build config needed. Deploy via the Git integration or the CLI
  (`npx vercel` for a preview, `npx vercel --prod` for production).
- Set environment variables in Vercel Project Settings -> Environment Variables. Secrets (server-only, no
  `NEXT_PUBLIC_` prefix): `SESSION_SECRET`, `PRIVATE_STOREFRONT_API_TOKEN`, `SITE_ORIGIN`. Public identity values use
  `NEXT_PUBLIC_*`, e.g. `NEXT_PUBLIC_STORE_DOMAIN`.
- `proxy.ts` is Next.js middleware and runs on Vercel. With no private token, requests fall back to `mock.shop`.

## Lockfile

The source template does not commit `pnpm-lock.yaml`; the root lockfile covers local workspace development. During
preview distribution, the release flow replaces `workspace:*` with the exact published Hydrogen version and generates
a standalone lockfile with `--ignore-workspace`.

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
setup split into server-only values (`SESSION_SECRET`, `PRIVATE_STOREFRONT_API_TOKEN`, `SITE_ORIGIN`) and
`NEXT_PUBLIC_*` public-identity values, noting that env vars are only required for real-store mode; `pnpm install` / `pnpm dev` /
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
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShopify%2Fhydrogen%2Ftree%2Fdist-preview%2Ftemplates%2Fnextjs)
   ```

2. **In the "Deploy to Vercel" section**, leading with the button and the one-click flow, then a short manual
   fallback. Use this shape:

   ```markdown
   ## Deploy to Vercel

   The fastest path is one click:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShopify%2Fhydrogen%2Ftree%2Fdist-preview%2Ftemplates%2Fnextjs)

   1. Click **Deploy with Vercel** above. Vercel clones this template into a new repository on your own Git provider (GitHub, GitLab, or Bitbucket).
   2. Keep the auto-detected Next.js settings (`next build`; no `vercel.json` needed).
   3. Deploy. The first build renders immediately with no environment variables, because the storefront falls back to `mock.shop`.
   4. Connect your store: add the env vars (see "Environment variables") under **Project Settings → Environment Variables**, then redeploy.

   Prefer to wire it up yourself? Push this project to a Git provider, import it in Vercel, keep the detected Next.js settings, and deploy — the same auto-detection and `mock.shop` fallback apply.
   ```

The button's `repository-url` points at `templates/nextjs` on the **`dist-preview`** branch of `Shopify/hydrogen`.
Keep that exact branch/path because it contains the compiled template with a published Hydrogen version, standalone
lockfile, and packaged skills. Do not point it at `preview`, whose source template uses `workspace:*`, or at the
repository root, which is not a deployable Next.js project.

## Validation

Before finishing:

1. Install with `CI=true` from the repository root.
2. Run `rg -n "@shared/|examples/shared|localCdnAssets|localHttps|lru-cache|catalog:|file:" templates/<name> -g '!pnpm-lock.yaml' -g '!node_modules' -g '!.agents/**'` — expect no matches. (`process.env` and `workspace:*` are expected in the source Next.js template.)
3. Run the template lint and typecheck (`eslint`, then `tsc --noEmit && hydrogen gql check --fail-on-warn`). Note: the GraphQL check passes without
   emitting the `*-graphql-env.d.ts` files on disk (they're gitignored, generated on demand) — that is expected.
4. Run `next build`. The source build can infer the repository workspace root; the standalone distribution should infer the template directory after installing its generated lockfile.
5. For distribution validation, copy the template to a temporary directory, replace `workspace:*` with the published
   Hydrogen preview version, generate `pnpm-lock.yaml` with `--ignore-workspace`, and verify it uses registry
   dependencies. Leave the source template lockfile-free.
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
