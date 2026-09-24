---
"@shopify/hydrogen": patch
"@shopify/hydrogen-react": patch
---

Shopify's consent API now returns visitor tracking values in the `consentManagement` response. Hydrogen reads them from there and shares them through the Customer Privacy API instead of `Server-Timing` headers, which are no longer collected or forwarded for tracking. The deprecated JavaScript-visible `_shopify_y` and `_shopify_s` cookies are no longer created, and existing ones are expired after the consent request forwards their values upstream, so sessions continue through the backend-managed cookies. Upgrade to keep visitor analytics and session continuity working as Shopify retires the deprecated cookies.
