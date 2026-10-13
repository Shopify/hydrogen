---
"@shopify/hydrogen": patch
---

`@shopify/hydrogen/vite` exports a deprecated `hydrogen()` again. It throws an error that names the installed version and the `~2026.4.0` pin that keeps a project on the version it was built for. Projects on 2026.4 whose `^2026.4.0` range resolved to 2026.10 previously failed at ESM link time with "does not provide an export named 'hydrogen'" and no hint about the cause.
