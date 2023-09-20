---
'@shopify/cli-hydrogen': minor
---

Add `--worker-unstable` flag to `h2 dev` and `h2 preview` commands. This flag enables the use of the new experimental worker runtime for local development, which is closer to Oxygen production than the current Node.js sandbox. Please report any issues you encounter with this flag.
