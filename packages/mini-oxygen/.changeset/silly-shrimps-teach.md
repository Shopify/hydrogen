---
'@shopify/mini-oxygen': patch
---

Fix error stack traces when using `script` option. The sourcemap for the script is loaded using the path passed in `workerFile`.
