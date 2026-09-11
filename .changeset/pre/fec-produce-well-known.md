---
"@shopify/hydrogen": patch
---

Allowlist the Frontend Event Collector ingress path (`/.well-known/shopify/fec/produce`) in the well-known proxy. This forwards the first-party path to the Online Store origin so WebMCP analytics reach the collector on headless storefronts, matching how Online Store storefronts route it through the myshopify.com edge.
