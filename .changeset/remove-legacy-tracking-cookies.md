---
"@shopify/hydrogen": patch
---

Stop creating and refreshing the deprecated JavaScript-visible `_shopify_y` and `_shopify_s` cookies from `ShopifyScripts`. Shopify's consent API and Storefront API manage visitor tracking state through the backend cookies.

Expire existing legacy cookies on successful HTTP responses to consent-management requests, after forwarding their IDs for migration into backend-managed cookies. Cleanup covers host-only and parent-domain cookies, including after consent denial or revocation.
