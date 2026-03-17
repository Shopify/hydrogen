---
'@shopify/cli-hydrogen': patch
---

Fix `hydrogen upgrade` failing with yarn and pnpm by using the correct package-specific install subcommand (`add` for yarn/pnpm, `install` for npm/bun) when upgrading dependencies
