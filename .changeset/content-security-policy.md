---
"@shopify/hydrogen": minor
---

Add framework-independent `createContentSecurityPolicy` and `getShopifyCspDirectives` utilities. Register a policy on a Shopify request context to apply its response header and forward it to a separate renderer, such as Next.js. Nonce policies prevent document caching; `nonce: false` supports cached HTML and prerendered shells without changing cache headers.

Directive arrays extend defaults, preserving the familiar customization behavior. The development build automatically allows common local HTTP and WebSocket connections. Inline-script and framework-specific evaluation allowances remain explicit. Nonces use Web Crypto, and React nonce context remains app-owned.
