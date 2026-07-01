---
'@shopify/mini-oxygen': patch
---

Fix `~/` path alias resolution in the MiniOxygen SSR environment

The Oxygen Vite plugin now captures the user's `resolve.tsconfigPaths` setting
from the top-level Vite config and forwards it to the custom SSR environment
returned by `configEnvironment()`. Because Vite environments are isolated, the
top-level resolve config does not automatically apply to custom environments
created by plugins, so tsconfig path aliases (e.g. `~/assets/favicon.svg`)
would fail to resolve at runtime.

Fixes #3816
