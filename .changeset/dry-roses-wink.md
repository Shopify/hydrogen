---
'@shopify/cli-hydrogen': patch
---

Fix `--quickstart` flag to support overwritting it with other flags. Example: `h2 init --quickstart --no-install-deps`.

Show error in `h2 debug cpu` command for Vite projects until we support it.

Remove deprecated `--styling` flag from the `h2 init` command.
