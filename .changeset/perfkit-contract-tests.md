---
---

Internal: add PerfKit integration contract tests (`PerfKit.test.tsx`) and export the pinned `PERF_KIT_URL` constant so the exact PerfKit SPA script URL and required `data-*` attributes are locked down and regression-tested. No runtime behavior change, nothing new exported from the package entrypoint, and no release required.

The tests assert the deterministic PerfKit contract: the pinned SPA script URL (`shopify-perf-kit-spa.min.js`), the exact `data-*` attributes (`data-application=hydrogen`, `data-spa-mode=true`, parsed `data-shop-id`, `data-storefront-id`, `data-monorail-region=global`, `data-resource-timing-sampling-rate=100`), that subscriptions wire only after the script status is `done` (never on `loading`/`error`) and never double-wire, that `ready()` is called once after wiring, and that `page_viewed -> navigate()` and product/collection/search/cart -> `setPageType(...)`.
