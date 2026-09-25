---
'@shopify/hydrogen': patch
'@shopify/hydrogen-react': patch
---

Shopify's consent API now returns visitor tracking values in the `consentManagement` response. Hydrogen now enables asynchronous consent initialization so the Customer Privacy API fetches and caches these values before analytics starts. This replaces Hydrogen's separate consent query and cache writes, as well as `Server-Timing` headers, which are no longer collected or forwarded for tracking. The deprecated JavaScript-visible `_shopify_y` and `_shopify_s` cookies are no longer created. Hydrogen leaves migration and expiration of legacy analytics and consent cookies to the Customer Privacy API. Upgrade to keep visitor analytics and session continuity working as Shopify retires the deprecated cookies.

Initial consent readiness also releases analytics for returning visitors when the privacy banner is enabled. Later consent changes refresh tracking permissions, and the Customer Privacy API can renew expired session tokens.

Session continuity requires the same-origin Storefront API proxy.

`useCustomerPrivacy`'s `onReady` callback now waits for consent as well as the selected APIs. If initial consent fails to load, analytics and PerfKit stay blocked until a successful consent update. Custom consent interfaces should use the returned `customerPrivacy` API when available to allow recovery, rather than relying only on `onReady` to display their controls.
