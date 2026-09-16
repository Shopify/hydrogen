---
"@shopify/hydrogen": patch
---

The packaged skills no longer tell agents to set the removed `future.v8_middleware` flag in `react-router.config.ts`. React Router 8 enables middleware always, so the `hydrogen-request-handlers`, `hydrogen-storefront-client`, and `hydrogen-oxygen` skills now describe it that way (the React Router 7 fallback is kept for older apps).
