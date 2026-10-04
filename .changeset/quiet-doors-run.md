---
'@shopify/mini-oxygen': patch
---

Run Vite module imports in a shared Durable Object context so concurrent requests do not reuse I/O across worker invocations.
