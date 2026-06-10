---
'@shopify/cli-hydrogen': patch
---

Fix `hydrogen upgrade` package manager detection in monorepos. The command now searches parent directories for a lockfile (such as a pnpm workspace root), so upgrades run with your workspace's package manager instead of falling back to npm.
