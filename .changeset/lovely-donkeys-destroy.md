---
'@shopify/cli-hydrogen': minor
---

`--env` flag has deprecated the `--env-branch` flag for several Hydrogen CLI commands

- `--env` will allow the user to provide an environment's handle when performing Hydrogen CLI commands
  - Run `env list` to display all the environments and its associated handles
- All Hydrogen CLI commands that contain the `--env-branch` flag will also contain the `--env` flag
- `--env-branch` flag will be deprecated on all Hydrogen CLI commands
