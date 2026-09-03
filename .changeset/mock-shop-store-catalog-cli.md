---
'@shopify/cli-hydrogen': patch
---

Tell agents and developers that mock.shop is a directory of mock stores: the `--mock-shop` flag, the onboarding prompt, the setup summary, and the dev-server message now point at https://mock.shop/llms.txt and explain how to pick a store with `PUBLIC_STORE_DOMAIN`. `isMockShop` recognizes per-store hosts such as `pets.mock.shop`.
