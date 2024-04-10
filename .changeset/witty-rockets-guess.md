---
'@shopify/cli-hydrogen': patch
---

Add `--verbose` flag to `h2 dev` and `h2 preview` commands to enable verbose logging.

Only CLI logs become verbose by default. If you also want to see verbose logs from Vite as well, use `DEBUG=* h2 dev` instead.
