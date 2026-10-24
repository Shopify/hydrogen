---
'@shopify/hydrogen': patch
---

`storefrontRedirect` and `customerAccount.login()` now use the normalized same-origin path of the `return_to` and `redirect` search params, and ignore values that don't resolve to one. Values without a leading `/` or a scheme, such as `return_to=some-page`, are no longer accepted.
