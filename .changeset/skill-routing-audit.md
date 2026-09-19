---
"@shopify/hydrogen": patch
---

Remove duplicated guidance from the packaged skills. The `hydrogen-setup` steps for analytics and the product detail page each carried their own copy of a domain skill's content, and the copies had diverged — the setup copy called `variantUrl` with the wrong number of arguments. Those steps now invoke `hydrogen-analytics` and `hydrogen-variant-form`, and the analytics guidance is split into per-framework and per-topic references that load only when a task needs them. The `hydrogen-smoke-test` skill no longer repeats its entire checklist twice.

Also corrects troubleshooting guidance that told apps to call `analytics.destroy()` during component teardown. That tears down the page-lifetime bus and deletes `window.Shopify.analytics`, so every later event is dropped silently. Clean up with the functions that `addDestination()`, `subscribe()`, and `trackCartAnalytics()` return instead.
