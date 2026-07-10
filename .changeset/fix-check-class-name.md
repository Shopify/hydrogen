---
'@shopify/cli-hydrogen': patch
---

Fix the `check` command class name from `GenerateRoute` to `Check` — a copy-paste error that caused confusion in stack traces and developer tooling.