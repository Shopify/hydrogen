---
'@shopify/mini-oxygen': patch
---

Run Vite module imports in a shared Durable Object context so concurrent requests can safely share in-flight module resolution.
