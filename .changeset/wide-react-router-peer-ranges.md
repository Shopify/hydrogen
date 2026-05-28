---
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
'@shopify/remix-oxygen': patch
'@shopify/create-hydrogen': patch
'skeleton': patch
---

Widen React Router peer dependency ranges so Hydrogen packages accept compatible React Router 7.15 patch versions without npm peer dependency conflicts. New Hydrogen projects now default to React Router 7.15.1.
