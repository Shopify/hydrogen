# @shopify/hydrogen-codegen

Thin configuration wrapper (~130 lines) over [`@shopify/graphql-codegen`](https://github.com/Shopify/graphql-codegen) that provides Hydrogen-specific defaults for GraphQL type generation. Generates `.d.ts` files extending `StorefrontQueries`, `StorefrontMutations`, `CustomerAccountQueries`, and `CustomerAccountMutations` interfaces on the `@shopify/hydrogen` module.

## Source Structure

Only 4 source files:

- **`src/index.ts`** — Re-exports from `@shopify/graphql-codegen` + local modules
- **`src/preset.ts`** — Wraps the upstream preset with Hydrogen defaults (auto-detects SFAPI vs CAAPI based on output filename)
- **`src/defaults.ts`** — SFAPI and CAAPI default config: namespace names, type import paths, `declare module` augmentation
- **`src/schema.ts`** — Resolves JSON schema file paths bundled in `@shopify/hydrogen`

## Upstream Dependency

The core codegen logic lives in a **separate repository**: [`github.com/Shopify/graphql-codegen`](https://github.com/Shopify/graphql-codegen). This is the sole runtime dependency. As of April 2026, the repo has only 3 published versions (0.0.1, 0.0.2, 0.1.0) and appears low-activity (last release: May 2024). Changes to the core codegen logic require a release in that repo first, then a version bump here.

Other consumers of `@shopify/graphql-codegen` beyond this package include `@shopify/api-codegen-preset` in `shopify-app-js` and `Shopify/forge`.

## Build Quirks

The `tsup.config.ts` uses `dts-bundle-generator` instead of tsup's built-in DTS generation. It **inlines types** from `@shopify/graphql-codegen` and `type-fest` into the output `.d.ts` so consumers don't need them as direct dependencies. There is also a post-build CJS plugin that rewrites `.js` extensions to `.cjs` in `require()` calls for the CJS build.

## Known Issues

- **Undeclared runtime dependency on `@shopify/hydrogen`**: `schema.ts` calls `require.resolve('@shopify/hydrogen/...')` but `@shopify/hydrogen` is not declared in `dependencies` or `peerDependencies`. This works because every consumer of this package also has `@shopify/hydrogen` installed.

- **CI tests workspace-linked deps, not what npm resolves**: The monorepo uses pnpm workspace linking, so CI always tests against the local source version of dependencies — not the version range that merchants would resolve from npm. Always create a changeset when modifying dependency versions in `package.json` (see Changeset Rule 3 in the root `CLAUDE.md`).

## How It's Used

The CLI dynamically imports this package (not a static dependency):

```
shopify hydrogen dev --codegen
  → packages/cli/src/lib/codegen.ts calls importLocal('@shopify/hydrogen-codegen')
    → Uses preset, getSchema, pluckConfig to configure @graphql-codegen/cli
    → Generates storefrontapi.generated.d.ts / customer-accountapi.generated.d.ts
```

It is an **optional peer dependency** of `@shopify/cli-hydrogen` and a **devDependency** of the skeleton template.

## Versioning

This package uses **SemVer** (not CalVer like `@shopify/hydrogen`). Currently at 0.x, where caret ranges behave counterintuitively: `^0.0.2` means `>=0.0.2 <0.0.3`, not `>=0.0.2 <0.1.0`.

## Testing

```bash
pnpm run test        # Unit tests + type-level tests (vitest with typecheck)
pnpm run build       # Build with tsup + dts-bundle-generator
pnpm run typecheck   # TypeScript type checking
```
