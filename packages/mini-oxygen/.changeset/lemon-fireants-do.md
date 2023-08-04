---
'@shopify/mini-oxygen': patch
---

Add a new `script` option as an alternative to `workerFile`. This option is used to pass the worker code directly instead of a file path. The `reload` methods also supports `script` to manually reload the worker code.
Expose `MiniOxygenOptions` type.
