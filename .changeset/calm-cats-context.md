---
"@shopify/hydrogen": patch
---

Source private Storefront API buyer IP exclusively from `requestContext`. Remove `buyerIp` from private client config and require a buyer-bearing context created with `createShopifyRequestContext({buyerIp})`.
