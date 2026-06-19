# Documentation Dependencies

Quick lookup: "I changed X, what docs do I update?"

## React Router Baseline

**Code**:
- `package.json`
- `pnpm-workspace.yaml`
- `packages/hydrogen/src/react-router-preset.ts`
- `packages/cli/package.json`
- `packages/cli/src/bin.ts`
- `packages/cli/src/commands/hydrogen/upgrade.ts`
- `templates/skeleton/package.json`
- `templates/skeleton/README.md`
- `templates/skeleton/react-router.config.ts`
- `docs/preview/package.json`

**Docs to Update**:
- `templates/skeleton/.cursor/rules/hydrogen-react-router.mdc` - import guidance for generated projects
- `templates/TEMPLATE_GUIDELINES.md` - route API terminology
- `packages/hydrogen/react-router.d.ts` - React Router augmentation comments
- `.claude/commands/changelog-update.md` - release changelog dependency rules
- `cookbook/recipes/*/README.md` and `cookbook/llms/*.prompt.md` - generated recipe examples after route or dependency baseline changes
- `docs/changelog.json` - release metadata when the release PR is generated
