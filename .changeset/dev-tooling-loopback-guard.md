---
'@shopify/hydrogen': patch
---

The `hydrogen dev` developer tooling routes (GraphiQL, the Subrequest Profiler, and the endpoints behind them) now respond only to requests from the machine running the dev server. Requests from other devices, for example when running with `--host`, receive a 404. Storefront routes are unaffected.
