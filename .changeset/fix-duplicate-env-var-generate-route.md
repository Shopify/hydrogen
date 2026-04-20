---
'@shopify/cli-hydrogen': patch
---

Fixed `shopify hydrogen generate route` where `--locale-param` shared the `SHOPIFY_HYDROGEN_FLAG_ADAPTER` environment variable with `--adapter`, causing both flags to receive the same value when that env var was set. `--locale-param` now reads from `SHOPIFY_HYDROGEN_FLAG_LOCALE_PARAM`.
