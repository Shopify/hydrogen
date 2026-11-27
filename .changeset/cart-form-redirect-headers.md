---
"@shopify/hydrogen": patch
---

The `303` redirect that answers a cart form submission no longer carries the Storefront API's response headers. It used to forward the API's `content-security-policy` (including `form-action 'none'`), `content-type: application/json`, CORS, `strict-transport-security`, and Shopify-internal headers onto the storefront's own redirect. The redirect now carries the Storefront API's cookies, the `cart` cookie, customer session headers, and private cache headers. JSON responses are unchanged.
