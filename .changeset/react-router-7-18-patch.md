---
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
'@shopify/remix-oxygen': patch
'@shopify/create-hydrogen': patch
'skeleton': patch
---

Update React Router to 7.18. Hydrogen, `@shopify/remix-oxygen` and `@shopify/cli-hydrogen` now accept React Router `~7.18.5`, and new projects default to React Router 7.18.6.

To upgrade an existing storefront, update `react-router`, `react-router-dom`, `@react-router/dev` and `@react-router/fs-routes` to `7.18.6` (or any later 7.18 patch) alongside Hydrogen.
