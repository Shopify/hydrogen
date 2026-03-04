---
'skeleton': patch
'@shopify/cli-hydrogen': patch
---

Updated loaders that used `customerAccount.handleAuthStatus()` to now await it.

### Migration

If you call `handleAuthStatus()` in your own loaders, update those callsites to use `await`.
