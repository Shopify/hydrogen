---
'@shopify/hydrogen': patch
---

Fix bug where `storefrontRedirect` would return an error on soft page navigations. Also change the redirect status code from 301 to 302.
