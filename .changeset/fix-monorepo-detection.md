---
'@shopify/cli-hydrogen': patch
'skeleton': patch
---

Improve monorepo detection and update CLI dependency

- **@shopify/cli-hydrogen**: The monorepo detection now checks for the existence of `templates/skeleton` directory instead of relying on the repository being cloned with a specific name. This fixes CI failures when the repository is cloned with non-standard names like `hydrogen-fork` or `hydrogen-test`.
- **skeleton**: Updated `@shopify/cli` from `~3.80.4` to `~3.83.3` to ensure compatibility with the upgrade command's dependency resolution logic.