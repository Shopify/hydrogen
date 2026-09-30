---
'@shopify/cli-hydrogen': patch
---

Fix `h2 env pull` corrupting environment variable values that contain backslashes, double quotes or tabs. Values are now single-quoted where possible so they are read back exactly by dotenv, and `$` and backticks are no longer expanded if the `.env` file is sourced by a shell.
