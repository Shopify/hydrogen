---
'@shopify/cli-hydrogen': minor
---

The build command now throws errors on CI when it can't find a valid lockfile. This should prevent unforseen issues related to dependency versioning in production.

This behavior can be disabled with the flag `--no-lockfile-check`, which might be useful in monorepos or other setups where the lockfile is not available in the project directory.
