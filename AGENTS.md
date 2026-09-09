# Agent Guidelines

## API Design Principles

When designing or adjusting APIs for the `hydrogen` package, closely follow the following principles:

- **No magic**: Prefer explicit over implicit.
- **Composable blocks**: Keep domains and features separated by composable parts.
- **Poka Yoke / Affordance**: Make it impossible to "hold it wrong".

## Testing

- Tests and type tests may use type assertions, `import()` type annotations, explicit `any`, and higher-complexity setup when that keeps mocks or compile-time assertions clear.
- Non-null assertions (`!`) are still forbidden in tests. Use an assertion helper instead so failures include a useful message.
- In Hydrogen package tests, import `assert` from `packages/hydrogen/src/core/test-utils.ts` rather than using `!`.

## Local HTTPS for Experiments

- Account-enabled framework experiments use `https://local.tryhydrogen.dev:5173` for Customer Account OAuth callback testing.
- Vite-based projects consume Hydrogen's default certificates. Certificates are provisioned automatically on `dev:https` startup. This downloads a pinned, checksum-verified mkcert release, trusts the local certificate authority, and creates the certificates under `~/.shopify/hydrogen/certs/`. Per-project quirks (for example which projects need a restart after first-run provisioning) live in [`experiments/README.md`](./experiments/README.md).
- The Next.js template provisions its own certificate. The Hydrogen experiment uses the Shopify CLI tunnel flow.
- Run the relevant project with `pnpm --filter @shopify/hydrogen-experiment-<name> dev:https` when that project provides the script.
