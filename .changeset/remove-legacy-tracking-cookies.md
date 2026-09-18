---
"@shopify/hydrogen": patch
---

Stop creating and refreshing the deprecated JavaScript-visible `_shopify_y` and `_shopify_s` cookies from `ShopifyScripts`. Shopify's consent API and Storefront API manage visitor tracking state through the backend cookies.

Forward incoming cookies unchanged so Shopify can resolve tracking state and migrate legacy identifiers. Stop converting legacy cookies into tracking headers or inferring tracking state from the presence of specific analytics cookies. The SFAPI proxy continues forwarding explicit token headers directly from the incoming request, without storing tokens in the request context.

Expire existing legacy cookies on successful HTTP responses to consent-management requests, after forwarding them upstream. Cleanup covers host-only and parent-domain cookies, including after consent denial or revocation.
