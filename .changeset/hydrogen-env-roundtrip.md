---
'@shopify/cli-hydrogen': patch
---

Keep environment variable values out of non-interactive confirmation errors. Preserve multiline values containing quotes and comment characters when pulling environment variables, and reject unsafe or unsupported quoting before changing the local file. Report no-change dry runs without rendering a diff, and consistently mark protected variables as skipped when pushing.
