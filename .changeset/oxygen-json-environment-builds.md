---
"@shopify/mini-oxygen": patch
---

The `oxygen()` Vite plugin now writes `oxygen.json` in builds that use the Vite Environment API, such as React Router 8 or React Router 7 with `future.v8_viteEnvironmentApi`. Before, it skipped the file in those builds, so Oxygen ran the worker on its fallback compatibility date, `2022-10-31`. That date has no `Headers.getSetCookie()`, so Hydrogen's Storefront API client failed every request.
