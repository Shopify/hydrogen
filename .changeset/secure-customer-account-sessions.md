---
'skeleton': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
'@shopify/hydrogen': patch
---

Mark the default session cookie as `Secure` in production in the skeleton template and examples. If you copied Hydrogen's default session setup, update your cookie configuration to set `secure: process.env.NODE_ENV === 'production'`.

Harden Customer Account login to reject plaintext HTTP redirect targets. After this update, `return_to` or `redirect` query parameters must use HTTPS and match the storefront's origin; otherwise the redirect falls back to `/account`. If you have custom redirect flows, ensure all redirect URLs use HTTPS.
