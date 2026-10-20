# Agent Guidelines

## Repo Skills

Skills live in the top-level `skills/` directory — repo-development guidance for agents working
in this repository. (User-facing skills shipped to merchants in the npm package live in
`packages/hydrogen/skills/` instead.) Each skill is symlinked into both `.agents/skills/` and
`.claude/skills/` so every agent harness discovers it. To add a new skill:

1. Write it at `skills/<name>/SKILL.md`.
2. Symlink it into both harness directories and commit the symlinks along with the skill:

   ```bash
   ln -s ../../skills/<name> .agents/skills/<name>
   ln -s ../../skills/<name> .claude/skills/<name>
   ```

Don't add skills directly to `.agents/skills/` or `.claude/skills/` — those only hold symlinks.

## API Design Principles

When designing or adjusting APIs for the `hydrogen` package, closely follow the following principles:

- **No magic**: Prefer explicit over implicit.
- **Composable blocks**: Keep domains and features separated by composable parts.
- **Poka Yoke / Affordance**: Make it impossible to "hold it wrong".

## Testing

- Tests and type tests may use type assertions, `import()` type annotations, explicit `any`, and higher-complexity setup when that keeps mocks or compile-time assertions clear.
- Non-null assertions (`!`) are still forbidden in tests. Use an assertion helper instead so failures include a useful message.
- In Hydrogen package tests, import `assert` from `packages/hydrogen/src/core/test-utils.ts` rather than using `!`.

## MiniOxygen

- `packages/mini-oxygen` keeps its existing code style: `oxfmt` skips it, and `.oxlintrc.json` turns off the rules its code breaks, including the testing rules above. Don't reformat or restyle it as part of unrelated changes.

## Local HTTPS for Examples

- Account-enabled framework examples use `https://local.tryhydrogen.dev:5173` for Customer Account OAuth callback testing.
- Vite-based examples consume Hydrogen's default certificates. Certificates are provisioned automatically on `dev:https` startup. This downloads a pinned, checksum-verified mkcert release, trusts the local certificate authority, and creates the certificates under `~/.shopify/hydrogen/certs/`. Nuxt and SolidStart may need one restart after first-run provisioning so their outer dev servers can load the certificate files.
- Outside CI, the local HTTPS plugin uses Shopify CLI to link an unlinked Hydrogen storefront and push the Customer Account callback, JavaScript origin, and logout URLs. Failures fall back to printing the values for manual configuration.
- The Next.js example provisions its own certificate. The Hydrogen example uses the Shopify CLI tunnel flow.
- Run the relevant example with `pnpm --filter @shopify/hydrogen-example-<name> dev:https` when that example provides the script.
- Reproduce the trusted local HTTPS CI check with `pnpm run test:local-https`. It starts the React Router template, so first build the template's workspace packages (`pnpm turbo run build --filter='@shopify/hydrogen-template-react-router^...'`, or `pnpm run build:pkgs`) and make sure certificates exist under `~/.shopify/hydrogen/certs/` (any prior `dev:https` run, or `node packages/hydrogen/bin/hydrogen.mjs certs install`).
