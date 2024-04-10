---
'@shopify/cli-hydrogen': minor
---

Deprecate the `--env-branch` flag, in favor of `--env`.

- `--env` accepts the environment's handle, instead of the environment's associated branch name
  - Run `env list` to display all environments and their handles
- Any CLI commands that accepted the `--env-branch` flag now accept the `--env` flag.
