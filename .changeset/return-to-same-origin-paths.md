---
"@shopify/hydrogen": patch
---

Only accept same-origin paths such as `/account/orders` as Customer Account redirect targets: `return_to` on the login, refresh, and logout handlers, `prepareLoginUrl({returnTo})`, and the `defaultPostLoginRedirectPathname` and `loginFailedRedirectPath` options. Other values, including same-origin absolute URLs, now fall back to the default redirect. If you pass `request.url` as `return_to` or `returnTo`, pass its `pathname`, `search`, and `hash` instead.
