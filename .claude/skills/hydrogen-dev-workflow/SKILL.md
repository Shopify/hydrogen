---
name: hydrogen-dev-workflow
description: >
  Development workflow guide for Shopify's Hydrogen
  framework. Covers testing, upgrading, recipes, PR conventions, analytics architecture,
  CLI tooling, and project scaffolding.
  Use when developing the Hydrogen framework. Also activates when someone mentions "recipes",
  "patch files", "customer account testing", "hydrogen upgrade", "skeleton template",
  "hydrogen CLI", "create-hydrogen", "hydrogen init", or "shopify-cli-update" in the headless context.
---

# Hydrogen Development Workflow

Development practices and workflow guide for engineers working on Shopify's headless storefront ecosystem. The Hydrogen framework repo is [`Shopify/hydrogen`](https://github.com/Shopify/hydrogen). For domain context, see the `headless-storefronts-context` skill. For repo locations, see the `shopify-repos` skill.

## Testing Customer Accounts Locally

To test anything in Hydrogen that requires a customer login (order history, account page, etc.):

1. **Start the dev server with the customer account push flag:**
   ```bash
   # Using npm
   pnpm run dev -- --customer-account-push

   # Using Hydrogen CLI directly (h2 is the Hydrogen CLI binary)
   h2 dev --customer-account-push
   ```
   Note the `--` separator when using `pnpm run dev`.

2. **Place a test order** using the [bogus gateway test payment details](https://help.shopify.com/en/manual/checkout-settings/test-orders/payments-test-mode#bogus-gateway-test-payment-details).

3. **Create a customer account** using any email and password.

4. After placing an order, you can log in and view orders in the customer account section.

## Hydrogen Recipes

Recipes are documented cookbook entries for adding features to a Hydrogen storefront. They exist as [markdown files in the dev docs](https://shopify.dev/docs/storefronts/headless/hydrogen/cookbook/bundles). The "apply" command and related tooling are purely for **internal use** to test or update the recipes -- merchants cannot programmatically apply recipes to their storefronts.

### Cookbook Architecture: Ingredients and Generated Docs

Each recipe has two layers that need to stay in sync:

**Ingredient files** (`cookbook/recipes/{name}/ingredients/templates/skeleton/app/routes/*.tsx`): These are **real, standalone `.tsx` route implementations** — not patches or diffs. They are applied when a merchant follows the recipe. When the skeleton has a bug (e.g., a missing `await`), the corresponding cookbook ingredient files may have the **same bug independently** and need to be fixed separately.

**Generated documentation** (`cookbook/recipes/{name}/README.md` and `cookbook/llms/{name}.prompt.md`): These files are **auto-generated** from the ingredient source files. They inline the full route source code, so if you fix the ingredient `.tsx` files, you MUST also regenerate the docs:

```bash
pnpm run cookbook -- render --recipe {name}
pnpm run cookbook -- validate --recipe {name}
```

Both the `README.md` and `llms/{name}.prompt.md` must be committed as part of the same fix. Failing to regenerate means the docs teach the wrong pattern even after the ingredient files are correct.

**Example**: The `markets` recipe has `($locale).account.$.tsx`, `($locale).account.addresses.tsx`, and `($locale).account.profile.tsx` as ingredient files. These are independent of the skeleton and don't automatically inherit skeleton fixes.

### Fixing Broken Recipes (Patch Files)

Recipe patch files can break when the skeleton template changes. Two approaches:

**For trivial 1-line changes:** Edit the patch files directly.

**For nontrivial changes:**
1. Create a new branch locally
2. Hard reset to the latest commit where the recipes DID apply cleanly
3. For each recipe:
   a. Apply the recipe
   b. Use Claude/LLM to apply all changes from that commit to latest `main` on the skeleton template with recipe applied
   c. Generate new patch files
   d. Un-apply the recipe and repeat for the next one

## Upgrading Hydrogen

The best way to upgrade a Hydrogen storefront is the [`upgrade` CLI command](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-upgrade):

```bash
pnpm exec shopify hydrogen upgrade
```

This command:
- Automatically bumps and installs all necessary dependencies
- For manual changes, generates a **markdown file** containing all required changes
- The markdown file is excellent for feeding to Claude or other LLMs to apply changes

**Best practice**: When upgrading across multiple major versions, upgrade **one major version at a time** and verify everything works between each bump. This is smoother than attempting multiple major version bumps at once.

## Skeleton Template

The skeleton template serves two purposes:

1. **Internal testing**: It is the single Hydrogen storefront we use to test and validate changes to Hydrogen. Located at `templates/skeleton` in the Hydrogen repo.
2. **New project scaffolding**: When a user scaffolds a new Hydrogen project (via `shopify hydrogen init` or `npm create @shopify/hydrogen`), they get a copy of the skeleton template.

Key facts:

- Lives in the Hydrogen monorepo at `templates/skeleton`
- Uses **built versions** of Hydrogen packages from the monorepo (not from npm)
- Bundled and released with the Hydrogen CLI
- Should always be up to date before a Hydrogen CLI release
- Can be updated before a release even if the Hydrogen CLI version isn't being bumped

Any change to the skeleton template requires a changeset — see the Changeset Rules in CLAUDE.md for details.

## PR Conventions

### Link Issues to PRs

Always include a link to the GitHub issue in your PR. Use `Closes <issue>` or `Fixes <issue>` so the issue automatically closes when the PR merges.

## Hydrogen Analytics Architecture

The analytics system in `packages/hydrogen/src/analytics-manager/` has several non-obvious design constraints worth knowing before debugging.

### Module-scoped singletons

`subscribers`, `registers`, and `waitForReadyQueue` are module-scoped (not instance-scoped). This means:
- They persist across React renders and React tree unmounts/remounts
- In tests, they accumulate state across test cases — a test that calls `register()` without `ready()` will block all subsequent tests
- There is exactly one analytics bus per JS context; multiple `<Analytics.Provider>` instances share state

### Consent enforcement is in the subscriber, not the publisher

`publish()` always enqueues events regardless of consent state. Consent is enforced at three downstream layers:
1. `ShopifyAnalytics` only calls `shopifyAnalyticsReady()` after `privacyReady` is true (privacy SDK loaded)
2. `prepareBasePageViewPayload` evaluates `customerPrivacy.analyticsProcessingAllowed()` at handler invocation time
3. `sendShopifyAnalytics` (in `hydrogen-react`) drops the event if `payload.hasUserConsent` is false

Do NOT add consent gating to `publish()` — it causes events to be dropped (not queued) before consent resolves, creating a race condition where events fired during initialization are permanently lost.

## Hydrogen CLI

The Hydrogen CLI source code lives at `packages/cli-hydrogen` in the Hydrogen repo. It is released to npm as its own package.

**Bundling in Shopify CLI**: Merchants typically do not use the Hydrogen CLI directly. Instead, it is bundled inside the Shopify CLI (in the `Shopify/cli` repo). After releasing a new version of the Hydrogen CLI to npm, you must also bump its version in the Shopify CLI.

**Timing**: The Shopify CLI releases a new minor version on a regular cadence. Hydrogen CLI bumps should NOT wait for the next Shopify CLI minor — release the bump as a **patch** of the current Shopify CLI minor version to get it out sooner.

**How to update**: A `shopify-cli-update` command exists in the Hydrogen repo at `.claude/commands/shopify-cli-update.md`. This is a Claude Code command — invoke it with `/shopify-cli-update` when working in the Hydrogen repo. It documents the full, nuanced, multi-step process. Always reference this command when performing the update — do not try to wing it from memory.

## Project Scaffolding

There are two ways to scaffold a new Hydrogen project:

1. **`shopify hydrogen init`** — via the Shopify CLI (which bundles the Hydrogen CLI)
2. **`npm create @shopify/hydrogen`** — via the `create-hydrogen` package

Both ultimately use the skeleton template. The `create-hydrogen` package uses the Hydrogen CLI's init function under the hood.

### Version Tags

- **`@latest`**: The most recent official release
- **`@next`**: Contains all Hydrogen changes that have been merged to main (with changesets), even before they have been officially released. A new `next` version is auto-published every time code is pushed to main.

The `next` tag is useful for merchant bug-fix validation: after merging a fix to main, the merchant can test with `npm create @shopify/hydrogen@next` to confirm the fix resolves their issue — before waiting for an official release.

### Scaffolding a Specific Version

`create-hydrogen` uses SemVer while Hydrogen uses CalVer — see the `hydrogen-versioning` skill for details on the relationship. Scaffolding a specific historical Hydrogen version requires a lookup step to find which `create-hydrogen` SemVer version includes the desired Hydrogen CalVer skeleton.

## Related Skills

- `hydrogen-release-process` — Release process, back-fixes, changelog.json, release failure recovery
- `hydrogen-versioning` — CalVer formats, version support policies, release cadence
- `CLAUDE.md` — Changeset rules (apply to every PR), skeleton/CLI bundling chain
