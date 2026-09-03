---
'@shopify/cli-hydrogen': minor
---

`init` can now pick a mock.shop store. Interactive `--mock-shop` runs choose from the live directory at https://mock.shop/llms.txt, `--mock-shop-store <subdomain|host>` selects one without a prompt (and implies `--mock-shop`), and the chosen store lands in `.env` as `PUBLIC_STORE_DOMAIN`. `--quickstart` and non-interactive runs keep the default store.
