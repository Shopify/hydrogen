---
"@shopify/hydrogen": minor
---

Require an asynchronous `setup({setTrackingConsent})` callback for `consent.mode: "custom-banner"` to connect third-party consent providers. Setup must synchronize the provider's consent with Shopify before resolving. Hydrogen buffers destination events until then, replays them when analytics consent is allowed, and discards them when denied. Setup failures keep delivery blocked.
