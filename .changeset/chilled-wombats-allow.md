---
'@shopify/storefront-kit-react': patch
---

In the version 2023.1.1 "Breaking Changes" section, we said

> The storefront client and ShopifyProvider now provide the `storeDomain` exactly as it is received; it's recommended that you pass the domain with the protocol and the fully-qualified domain name for your Storefront. For example: `https://hydrogen-test.myshopify.com`

Unfortunately, the Storefront Client wasn't fully updated to actually do that. This update corrects this bug, but also means that you need to provide a full URL to your Storefront Domain (as was originally intended in our breaking change update).
