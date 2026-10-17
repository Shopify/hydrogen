---
'@shopify/hydrogen': patch
---

When the login request has no `return_to` or `redirect` search param, `customerAccount.login()` now saves the post-sign-in redirect as a normalized path on your storefront's origin, falling back to `defaultRedirectPath` otherwise.
