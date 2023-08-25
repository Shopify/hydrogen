---
'@shopify/cli-hydrogen': patch
---

Fix development server port in some situations where it was set to a random number instead of the default 3000 or the `--port` flag value.
