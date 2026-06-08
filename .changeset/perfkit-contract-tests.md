---
"@shopify/hydrogen": patch
---

Add PerfKit integration contract tests and export the internal `PERF_KIT_URL` constant; the PerfKit script `data-*` attributes are now memoized. This locks down the deterministic PerfKit contract (pinned SPA script URL, required `data-*` attributes, subscription wiring/readiness, and `navigate()` / `setPageType(...)` on the view events) so it can't regress. No change to runtime behavior.
