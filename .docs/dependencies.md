# Documentation Dependencies

## Hydrogen Local HTTPS

When changing `@shopify/hydrogen/vite` local HTTPS behaviour, update these together:

- `packages/hydrogen/src/vite/*`
- `packages/hydrogen/skills/hydrogen-local-https/SKILL.md`
- `templates/react-router/README.md`
- `templates/react-router/package.json`
- `templates/react-router/vite.config.ts`
- framework example `dev:https` scripts and configs under `examples/*`

`scripts/preview-template-dist.ts` copies `packages/hydrogen/skills` into template `.agents/skills` when preparing the dist branch, so template source directories should not duplicate those generated skill copies.
