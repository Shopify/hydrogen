---
'@shopify/cli-hydrogen': patch
---

Updates `customer-account push` to support multiple concurrent dev servers. Previously, starting a second dev server with `--customer-account-push` would overwrite the callback URIs set by the first, breaking Customer Account sign-in for the first server. Now each server additively registers its own callbIck URIs and removes only its own on shutdown.
