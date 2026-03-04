---
'@shopify/hydrogen': patch
---

Fixed the customer account auth status typing so `customerAccount.handleAuthStatus()` is typed as async (`Promise<void>`), matching runtime behavior.
