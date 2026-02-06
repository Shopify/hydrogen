---
'skeleton': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Add support for Bun's text-based lockfile (`bun.lock`) introduced in Bun 1.2, and npm's shrinkwrap lockfile (`npm-shrinkwrap.json`), as alternatives to their respective primary lockfiles (`bun.lockb` and `package-lock.json`).
