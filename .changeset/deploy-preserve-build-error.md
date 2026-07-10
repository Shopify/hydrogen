---
'@shopify/cli-hydrogen': patch
---

Preserve actionable build errors during `h2 deploy`. When the build step fails (for example, when the `vite` package is missing from the project), the original error and its guidance are now surfaced instead of being wrapped into a generic "Build function failed with error" message and reported as an uncaught crash.
