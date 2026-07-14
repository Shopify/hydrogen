---
'@shopify/hydrogen': patch
---

Fix a CSP nonce hydration mismatch warning from `ShopifyScripts`. When a nonce is supplied, browsers hide the parsed script's nonce content attribute (exposing `nonce=""` while retaining the real value on the `.nonce` property), which React reported as an attribute mismatch on the external generated script on every full page load. The generated script tags now suppress this known, benign diff when a nonce is provided, keeping unrelated hydration diagnostics visible.
