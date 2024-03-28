---
'@shopify/cli-hydrogen': major
---

Hydrogen CLI now requires `@shopify/mini-oxygen` to be installed separately as a dev dependency. It is still used automatically under the hood so there is no need to change your application code aside from installing the dependency.

Also, if a port provided via `--port` or `--inspector-port` flags is already in use, the CLI will now exit with an error message instead of finding a new open port. When the flags are not provided, the CLI will still find an open port.
