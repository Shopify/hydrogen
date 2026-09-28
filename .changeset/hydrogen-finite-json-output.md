---
'@shopify/cli-hydrogen': minor
---

Add typed JSON output and discoverable result schemas to finite Hydrogen CLI commands. Use `--json` for a machine-readable result or `--json-schema` to inspect its schema. Progress and diagnostics use JSON events on stderr, while deployment CI files and environment file updates retain their existing behavior. Build and codegen watch modes cannot be combined with `--json`.
