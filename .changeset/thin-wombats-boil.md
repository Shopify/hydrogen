---
'@shopify/cli-hydrogen': patch
---

Fixed a regression in `hydrogen build` where the environment variable `HYDROGEN_ASSET_BASE_URL` was ignored when used as build command when deploying.
