---
'@shopify/cli-hydrogen': patch
---

Add `--non-interactive` flag (alias `-y`/`--yes`, env `SHOPIFY_HYDROGEN_FLAG_NON_INTERACTIVE`) to `shopify hydrogen upgrade` so it can run in CI and other non-TTY environments. Requires `--version` to be set, auto-accepts the confirmation prompt, and auto-overwrites any existing upgrade instructions file. When run without a TTY and without this flag, the resulting error now points to it.
