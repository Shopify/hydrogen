---
'@shopify/cli-hydrogen': minor
'@shopify/create-hydrogen': patch
---
Add `--json` output to `shopify hydrogen shortcut` and `shopify hydrogen upgrade`.

`shopify hydrogen shortcut` now exits with code 1 when it cannot configure any supported shell, in both text and JSON modes.
