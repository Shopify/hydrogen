---
'@shopify/cli-hydrogen': major
---

The worker runtime, previously used with `--worker` flag, is now the default runtime in the `dev` and `preview` commands. The legacy Node.js sandbox runtime can still be used with the `--legacy-runtime` but will be removed in a future release.
