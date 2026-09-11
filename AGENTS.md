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

- Account-enabled framework examples use `https://local.tryhydrogen.dev:5173` for Customer Account OAuth callback testing.
- Vite-based examples consume Hydrogen's default certificates. Certificates are provisioned automatically on `dev:https` startup. This downloads a pinned, checksum-verified mkcert release, trusts the local certificate authority, and creates the certificates under `~/.shopify/hydrogen/certs/`. Nuxt and SolidStart may need one restart after first-run provisioning so their outer dev servers can load the certificate files.
- The Next.js example provisions its own certificate. The Hydrogen example uses the Shopify CLI tunnel flow.
- Run the relevant example with `pnpm --filter @shopify/hydrogen-example-<name> dev:https` when that example provides the script.
