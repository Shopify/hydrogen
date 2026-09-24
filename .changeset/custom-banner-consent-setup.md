---
"@shopify/hydrogen": minor
---

Require an asynchronous `setup()` callback for `consent.mode: "custom-banner"` to connect third-party consent providers. Setup must synchronize the provider's consent through `window.Shopify.customerPrivacy` before resolving. Hydrogen buffers destination events until then, replays them when analytics consent is allowed, and discards them when denied. Setup failures keep delivery blocked.

Migration from earlier previews: replace `consent={{mode: "custom-banner"}}` with `consent={{mode: "custom-banner", setup}}`. The callback is now required by TypeScript. JavaScript integrations without it log a warning during browser initialization and keep analytics delivery blocked.
