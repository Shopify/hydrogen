---
"@shopify/hydrogen": patch
---

The `hydrogen-request-handlers`, `hydrogen-storefront-client`, and `hydrogen-oxygen` skills no longer hardcode the `future.v8_middleware` flag. They now tell agents to make sure middleware is enabled for the app's version of React Router.
