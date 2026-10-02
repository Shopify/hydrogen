# Observe Synthetic Checks — consent suite

Runs the `new-cookies` consent e2e suite in [Observe Synthetic
Checks](https://observe.shopify.io/a/observe/monitoring/synthetic) (team:
Developer Platforms) against deployed Hydrogen storefronts, so the async
consent flow keeps being verified in production after it shipped in
[hydrogen#4085](https://github.com/Shopify/hydrogen/pull/4085).

## What runs where

- Each entry in `metadata.json` becomes one Observe check: the spec is
  bundled into a single self-contained `.spec.mjs` (one file per check) and
  uploaded as the check's `testCode`. Observe runs it as a plain Playwright
  test — no dev server, no repo fixtures.
- Test store keys resolve to deployed storefront URLs through the baked-in
  `E2E_OBSERVE_STORE_URLS` map (see `e2e/fixtures/observe.ts`), so multi-store
  specs (e.g. `consent-initialization`) exercise both consent configurations.
- The privacy banner is toggled per test through the `e2e_privacy_banner`
  cookie, which the skeleton's root loader reads — deployed builds serve
  hashed assets, so the dev-server bundle patching cannot apply there.
- `fixture-contracts.spec.ts` is intentionally excluded: it tests the fixture
  library itself with fake origins, not a storefront.
- Failures alert through the shared rule created by `alert-rule.mjs` (fires
  after two failing runs within two intervals; posts to
  #online-store-developer-platforms-operations via the "Developer Platforms -
  Synthetic Tests" notification policy).

## Deploying the storefronts

The two consent test stores each need a deployed skeleton storefront (the
store keys already exist in `e2e/envs/`):

```bash
cd templates/skeleton
pnpm exec shopify hydrogen deploy --env-file ../../e2e/envs/.env.defaultConsentAllowed_cookiesEnabled
pnpm exec shopify hydrogen deploy --env-file ../../e2e/envs/.env.defaultConsentDisallowed_cookiesEnabled
```

Deployments must be kept reasonably current with `main` for the checks to
track shipped behavior; redeploy after consent-flow changes.

## Building, verifying, and uploading

```bash
# 1. Build bundles (needs the deployment URLs; loadtest header comes from ejson)
HYDROGEN_E2E_OBSERVE_STORE_URLS='{"defaultConsentAllowed_cookiesEnabled":"https://…","defaultConsentDisallowed_cookiesEnabled":"https://…"}' \
  pnpm e2e:observe:build

# 2. Verify locally, exactly like the Observe runner (no repo config, no dev server):
#    start dev servers for both stores, build with their localhost URLs, then
pnpm exec playwright test --config e2e/observe/verify.config.ts --retries=0

# 3. Upload to Observe (OBSERVE_AUTH_TOKEN from the "E2E - Admin Web" 1Password vault,
#    the same credentials dev e2e sync-to-observe uses in admin-web)
OBSERVE_AUTH_TOKEN='username:password' pnpm e2e:observe:upload

# 4. Create/update the shared alert rule
OBSERVE_AUTH_TOKEN='username:password' pnpm e2e:observe:alert-rule
```

Checks are created **disabled** (team convention): after uploading, watch the
first executions on the check pages, then enable them. `e2e:observe:sync`
runs build + upload in one step for updating existing checks after a test
change.

## After changing the consent specs

Syncing is manual — merging a change to `main` does NOT update the checks.
After your change merges:

```bash
HYDROGEN_E2E_OBSERVE_STORE_URLS='…' OBSERVE_AUTH_TOKEN='…' pnpm e2e:observe:sync
```
