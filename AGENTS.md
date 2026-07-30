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

## Local HTTPS for Examples

- Account-enabled framework examples use `https://localtest.me:5173` for Customer Account OAuth callback testing.
- On macOS, install `mkcert` with Homebrew before running those examples: `brew install mkcert`.
- From the repository root, run `pnpm https:setup` once to trust the local certificate authority and create the `localtest.me` certificates under `.cert/`.
- After setup, run the relevant example with `pnpm --filter @shopify/hydrogen-example-<name> https:dev` when that example provides the script.
