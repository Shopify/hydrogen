---
"@shopify/hydrogen": patch
---

Reject Customer Account redirect targets whose normalized path starts with `//`, which resolved to another host. This covers `return_to` on the login, refresh, and logout handlers, `prepareLoginUrl({returnTo})`, and the `defaultPostLoginRedirectPathname` and `loginFailedRedirectPath` options. Same-origin paths and absolute URLs still work. Values without a leading `/` or a scheme, such as `account/orders`, now fall back to the default redirect.
