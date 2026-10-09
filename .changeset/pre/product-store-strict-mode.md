---
"@shopify/hydrogen": patch
---

Fix product form store losing its cart subscription after React StrictMode effect replay in development. The store now exposes a `connect()` method that re-subscribes to the cart store, and `ProductProvider` calls it on every effect mount so the subscription survives StrictMode's mount → cleanup → remount cycle.
