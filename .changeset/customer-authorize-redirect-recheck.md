---
'@shopify/hydrogen': patch
---

`customerAccount.authorize()` now redirects to the normalized same-origin path of the saved post-sign-in redirect, and falls back to `defaultRedirectPath` when the saved value doesn't resolve to one.
