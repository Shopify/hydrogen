# Benchmark Workspace Agent Instructions

You are running inside an isolated Hydrogen benchmark workspace.

## Required Behavior

- Treat this directory as the full project context.
- Do not read parent directories.
- Use local skills when the prompt asks for them.
- If asked to verify benchmark setup, load the `benchmark-canary` skill and follow it exactly.
- This workspace is a Vite, TypeScript, Tailwind, React Router framework-mode app.
- `@shopify/hydrogen` is seeded as a local tarball dependency at `file:./vendor/hydrogen.tgz`. Run `pnpm install` before using its binary or imports.
- After install, run `pnpm hydrogen setup` before invoking the `hydrogen-setup` skill.
- Use `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`, and `PRIVATE_STOREFRONT_API_TOKEN` for Hydrogen environment variables. If a framework needs a client-exposed prefix, preserve the canonical suffix. Never expose `PRIVATE_STOREFRONT_API_TOKEN` client-side.

## Canary

The benchmark canary phrase is: `hydrogen-benchmark-agent-instructions-loaded`.
