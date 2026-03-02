---
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
---

Fixed the customer account auth status typing so `customerAccount.handleAuthStatus()` is typed as async (`Promise<void>`), matching runtime behavior.

Updated skeleton account loaders to `await customerAccount.handleAuthStatus()` so auth redirects propagate correctly and there are no floating promises.

If you call `handleAuthStatus()` in your own loaders, update those callsites to use `await`.
