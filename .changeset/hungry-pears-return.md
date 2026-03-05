---
'@shopify/cli-hydrogen': patch
---

Fixed `--package-manager` flag being ignored when `--install-deps` was explicitly passed. Projects now correctly use the specified package manager for dependency installation.
