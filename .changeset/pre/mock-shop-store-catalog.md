---
"@shopify/hydrogen": patch
---

Cart permalinks now hand off to the mock.shop demo store for every mock.shop host, not only `mock.shop` itself, so a storefront built against a per-store host such as `pets.mock.shop` behaves the same in mock mode. The `hydrogen-storefront-client` and `hydrogen-setup` skills now explain that mock.shop is a catalog of stores and how to pick one from https://mock.shop/llms.txt.
