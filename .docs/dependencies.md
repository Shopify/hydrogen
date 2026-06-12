# Documentation Dependencies

Quick lookup: "I changed X, what docs do I update?"

## Packaged Hydrogen Skills

**Code**: `packages/hydrogen/skills/**`

**Docs to update**:
- `packages/hydrogen/skills/hydrogen-setup/SKILL.md` when the end-to-end setup flow changes.
- `packages/hydrogen/skills/hydrogen-setup/references/*.md` when setup-owned route, analytics, navbar, or request-handler guidance changes.
- `packages/hydrogen/skills/hydrogen-storefront-client/SKILL.md` and `packages/hydrogen/skills/hydrogen-storefront-client/references/*.md` when Storefront API client setup, `gql()` query authoring, or query validation guidance changes.
- `packages/hydrogen/skills/hydrogen-cart-ui/SKILL.md` and `packages/hydrogen/skills/hydrogen-cart-ui/references/*.md` when cart store behavior, form contracts, or framework cart bindings change.
- `packages/hydrogen/skills/hydrogen-cart-drawer/SKILL.md` and `packages/hydrogen/skills/hydrogen-cart-drawer/references/*.md` when cart drawer behavior, dialog accessibility, or open-cart integration changes.
- `packages/hydrogen/skills/hydrogen-variant-form/SKILL.md` when product option selection, variant URL sync, or add-to-cart form behavior changes.
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
- `packages/hydrogen/skills/hydrogen-setup/SKILL.md` if analytics installation order changes.
- Example READMEs under `examples/**/README.md` when analytics behavior is visible in examples.

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
