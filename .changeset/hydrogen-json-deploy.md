---
'@shopify/cli-hydrogen': minor
---
Add `--json` output to `shopify hydrogen deploy`.

Exit with an error when a linked storefront is missing in `deploy`, `env list`, or `env pull`, or when a deployment token cannot be retrieved. Treat a failure to write the deployment log as a warning after a successful deployment.
