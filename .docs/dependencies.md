# Documentation Dependencies

## Hydrogen Cart Store API

When changing the cart store's public surface (`CartStore`, React/Vue `createCartComponents` outputs, or the cart action hooks/composables), update these together:

- `packages/hydrogen/src/core/cart/cart.ts`
- `packages/hydrogen/src/react/cart.tsx` and `packages/hydrogen/src/react/index.ts`
- `packages/hydrogen/src/vue/cart.ts` and `packages/hydrogen/src/vue/index.ts`
- `packages/hydrogen/skills/hydrogen-cart-ui/SKILL.md`
- `packages/hydrogen/skills/hydrogen-cart-ui/references/react.md`
- `packages/hydrogen/skills/hydrogen-cart-ui/references/vue.md`

## Hydrogen Cart Metafields

When changing the cart metafields pattern (app-owned metafield route, custom `CartFragment` reads, or the mutate-then-`refresh()` flow), update these together:

- `examples/hydrogen/app/lib/cart-metafields.server.ts` (app-owned route)
- `examples/hydrogen/app/lib/cart-handlers.ts` (`CartFragment` reads)
- `examples/hydrogen/app/components/CartDeliveryInstructions.tsx` (client)
- `packages/hydrogen/skills/hydrogen-cart-metafields/SKILL.md`
- `packages/hydrogen/skills/hydrogen-cart-ui/SKILL.md` (cross-reference)

## Hydrogen Local HTTPS

When changing `@shopify/hydrogen/vite` local HTTPS behaviour, update these together:

- `packages/hydrogen/src/vite/*`
- `packages/hydrogen/skills/hydrogen-local-https/SKILL.md`
- `templates/react-router/README.md`
- `templates/react-router/package.json`
- `templates/react-router/vite.config.ts`
- framework example `dev:https` scripts and configs under `examples/*`

`scripts/preview-template-dist.ts` syncs `packages/hydrogen/skills` into each template's harness skill directories (`.claude/skills` and `.agents/skills`) when preparing the dist branch, so template source directories should not duplicate those generated skill copies.

## Hydrogen Skills Sync

When changing how synced skills are stamped or verified (the frontmatter `metadata` block with `source`, `version`, and `hash`, or the overwrite/skip/remove rules), update these together:

- `packages/hydrogen/src/cli/skills.ts` (single writer and reader of the metadata block)
- `scripts/preview-template-dist.ts` (imports `syncSkills` so template copies carry the same metadata)
- `hydrogen skills check` in the same file (reads `getSkillsSyncStatus`, prints `describeSkillsSyncStatus`)
- `packages/hydrogen/README.md` ("Keeping skills in sync")
- root `README.md` ("Set up in your own project")

## Hydrogen CalVer

When changing how Hydrogen's changeset bumps map onto its `YYYY.Q.P` versions, update these together:

- `scripts/calver.ts` (the mapping, the `check` guard, and the release title)
- `package.json` (`version-packages` runs `scripts/calver.ts version`)
- `.github/workflows/release.yml` (runs `check`, names the release PR with `next`, and versions with `pnpm run version-packages`)
- `.github/workflows/ci.yml` (runs `check` on pull requests)
- `skills/pull-request-standards/SKILL.md` ("Versioning")

## Changesets Tooling

`changesets/action` bundles its own copies of `@changesets/read` and `@changesets/pre` (see its `package.json` at the SHA pinned in `.github/workflows/release.yml`) to read `.changeset/` and pick between opening a release PR and publishing. Keep `@changesets/cli` and `@changesets/parse` in the root `package.json` on a release whose `read` and `pre` use the same `.changeset/pre/` layout. When they disagree about where released prerelease changesets live, the action can keep versioning and never publish. `scripts/calver.ts check` fails if `.changeset/pre/` still has changesets once `.changeset/pre.json` is gone, or if `pre.json` still lists changesets in the old layout.

## Template Workspace Dependencies

When changing which workspace packages a template depends on (`@shopify/hydrogen`, `@shopify/mini-oxygen`), or how the dist flow pins them, update these together:

- `templates/*/package.json`
- `scripts/preview-template-dist.ts` (pins every `workspace:` dependency before standalone lockfiles are generated)
- `.github/workflows/release.yml` (waits for the pinned versions on npm, then generates the standalone lockfiles)
- `.github/workflows/ci.yml` (the local HTTPS job builds the React Router template's workspace packages before running it)
- `AGENTS.md` ("Local HTTPS for Examples" says which packages to build before reproducing that job)
- `turbo.json` (template `build` tasks list their workspace packages' builds explicitly)
- `packages/mini-oxygen/package.json` (its `vite` must resolve to the same version as its consumers'; `scripts/workspace-vite.test.ts` checks this)
- `skills/create-oxygen-template/SKILL.md` ("Workspace dependencies", "Lockfile")
- `skills/create-oxygen-template/reference/react-router-pattern.md` ("Dependencies")
- `skills/create-vercel-template/SKILL.md` ("Hydrogen dependency", "Lockfile", "Validation")
