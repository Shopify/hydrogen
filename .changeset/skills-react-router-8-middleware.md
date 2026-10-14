---
"@shopify/hydrogen": patch
---

The `hydrogen-request-handlers`, `hydrogen-storefront-client`, `hydrogen-oxygen`, and `migrate-to-hydrogen-2026-10` skills no longer hardcode the `future.v8_middleware` flag. They now tell agents to make sure middleware is enabled for the app's version of React Router.
