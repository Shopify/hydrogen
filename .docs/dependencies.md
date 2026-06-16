# Documentation Dependencies

Quick lookup: "I changed X, what docs do I update?"

## Packaged Hydrogen Skills

**Code**: `packages/hydrogen/skills/**`

**Docs to update**:
- `packages/hydrogen/skills/hydrogen-setup/SKILL.md` when the end-to-end setup flow changes.
- `packages/hydrogen/skills/hydrogen-setup/references/*.md` when setup-owned route, analytics, navbar, or request-handler guidance changes.
- `packages/hydrogen/skills/hydrogen-storefront-client/SKILL.md` and `packages/hydrogen/skills/hydrogen-storefront-client/references/*.md` when Storefront API client setup, `gql()` query authoring, or query validation guidance changes.
- `packages/hydrogen/skills/hydrogen-request-handlers/SKILL.md` and `packages/hydrogen/skills/hydrogen-request-handlers/references/*.md` when request interceptor, proxy, redirect, middleware, or response-header propagation guidance changes.
- `packages/hydrogen/skills/hydrogen-cart-ui/SKILL.md` and `packages/hydrogen/skills/hydrogen-cart-ui/references/*.md` when cart store behavior, form contracts, or framework cart bindings change.
- `packages/hydrogen/skills/hydrogen-cart-drawer/SKILL.md` and `packages/hydrogen/skills/hydrogen-cart-drawer/references/*.md` when cart drawer behavior, dialog accessibility, or open-cart integration changes.
- `packages/hydrogen/skills/hydrogen-variant-form/SKILL.md` and `packages/hydrogen/skills/hydrogen-variant-form/references/*.md` when product option selection, variant URL sync, framework product bindings, or add-to-cart form behavior changes.
- `packages/hydrogen/skills/hydrogen-collection-browser/SKILL.md` and `packages/hydrogen/skills/hydrogen-collection-browser/references/*.md` when collection/search filtering, sorting, URL serialization, or browse-state behavior changes.
- `packages/hydrogen/skills/hydrogen-shop-pay/SKILL.md` and `packages/hydrogen/skills/hydrogen-shop-pay/references/*.md` when Shop Pay helpers or framework bindings change.
- `packages/hydrogen/skills/hydrogen-money/SKILL.md` when money formatting behavior or recommended display patterns change.
- `packages/hydrogen/skills/hydrogen-analytics/SKILL.md` and `packages/hydrogen/skills/hydrogen-analytics/references/*.md` when analytics setup, consent, destinations, or event payload guidance changes.
- `packages/hydrogen/skills/hydrogen-smoke-test/SKILL.md` when runtime verification expectations change.
- `.changeset/*.md` when packaged skill changes should ship in `@shopify/hydrogen`.

## Cart Form Contract

**Code**: `packages/hydrogen/src/core/cart/**`, `packages/hydrogen/src/react/**`, `packages/hydrogen/src/vue/**`

**Docs to update**:
- `packages/hydrogen/skills/hydrogen-cart-ui/SKILL.md` for framework-neutral cart behavior.
- `packages/hydrogen/skills/hydrogen-cart-ui/references/react.md` for React binding examples.
- `packages/hydrogen/skills/hydrogen-cart-ui/references/vue.md` for Vue/Nuxt binding examples.
- `packages/hydrogen/skills/hydrogen-cart-drawer/SKILL.md` when drawer line item forms must mirror cart-page behavior.
- Example READMEs under `examples/**/README.md` when user-facing cart behavior changes.

## Analytics Setup

**Code**: `packages/hydrogen/src/core/analytics/**`, `packages/hydrogen/src/react/**`, `packages/hydrogen/src/vue/**`, `examples/**/app/**`, `examples/**/src/**`

**Docs to update**:
- `packages/hydrogen/skills/hydrogen-setup/references/analytics.md` for setup guidance and framework examples.
- `packages/hydrogen/skills/hydrogen-analytics/SKILL.md` and `packages/hydrogen/skills/hydrogen-analytics/references/*.md` for task-focused analytics guidance.
- `packages/hydrogen/skills/hydrogen-setup/SKILL.md` if analytics installation order changes.
- Example READMEs under `examples/**/README.md` when analytics behavior is visible in examples.

## Collection/Search Browse Contract

**Code**: `packages/hydrogen/src/core/collection/**`, `packages/hydrogen/src/react/collection.tsx`, `packages/hydrogen/src/vue/collection.ts`, `examples/**/collections/**`, `examples/**/search/**`

**Docs to update**:
- `packages/hydrogen/skills/hydrogen-collection-browser/SKILL.md` for framework-neutral browse behavior.
- `packages/hydrogen/skills/hydrogen-collection-browser/references/*.md` for framework-specific collection/search route patterns.
- `packages/hydrogen/skills/hydrogen-setup/SKILL.md` if baseline setup adds or removes collection/search browse steps.

## Shop Pay

**Code**: `packages/hydrogen/src/core/shop-pay/**`, `packages/hydrogen/src/react/shop-pay.tsx`, `packages/hydrogen/src/vue/shop-pay.ts`

**Docs to update**:
- `packages/hydrogen/skills/hydrogen-shop-pay/SKILL.md` and `packages/hydrogen/skills/hydrogen-shop-pay/references/*.md`.
- `packages/hydrogen/skills/hydrogen-variant-form/SKILL.md` when product add-to-cart guidance changes.

## Product Variant Form

**Code**: `packages/hydrogen/src/core/product/**`, `packages/hydrogen/src/react/product.tsx`, `packages/hydrogen/src/vue/product.ts`, `examples/**/products/**`

**Docs to update**:
- `packages/hydrogen/skills/hydrogen-variant-form/SKILL.md` for framework-neutral selection, URL sync, combined listings, and add-to-cart behavior.
- `packages/hydrogen/skills/hydrogen-variant-form/references/*.md` for framework-specific product page binding examples.
- `packages/hydrogen/skills/hydrogen-setup/references/product-page.md` when the Storefront API product query contract changes.

## Money Formatting

**Code**: `packages/hydrogen/src/core/money/**`

**Docs to update**:
- `packages/hydrogen/skills/hydrogen-money/SKILL.md`.
- Skills that render prices or totals: cart UI, variant form, collection browser, markets, and setup references.

## Storefront API Query Validation

**Code**: `packages/hydrogen/src/client/**`, `packages/hydrogen/src/graphql/**`, `packages/hydrogen/codegen.ts`

**Docs to update**:
- `packages/hydrogen/skills/hydrogen-storefront-client/SKILL.md` for client and `gql()` authoring guidance.
- `packages/hydrogen/skills/hydrogen-storefront-client/references/query-validation.md` for headless validation guidance.
- `packages/hydrogen/skills/hydrogen-setup/references/product-page.md` when product query requirements change.

## Benchmark Harness

**Code**: `scripts/storefront-benchmark-harness/**`

**Docs to update**:
- `scripts/storefront-benchmark-harness/README.md` for runtime behavior, template contents, required environment variables, and optional flags.
- `scripts/storefront-benchmark-harness/workspace-template/AGENTS.md` when benchmark-only agent expectations change.
- `scripts/storefront-benchmark-harness/workspace-template/.opencode/skills/**` when benchmark skill discovery checks change.
- `package.json` scripts when command names or invocation patterns change.
