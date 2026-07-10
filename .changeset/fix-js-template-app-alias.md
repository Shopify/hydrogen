---
'skeleton': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Add an explicit `~` app alias to new Hydrogen projects.

JavaScript projects use `jsconfig.json`, which is not reliably covered by Vite's native `resolve.tsconfigPaths` behavior. New projects now define Hydrogen's `~/` import convention directly in the Vite config so imports like `~/assets/favicon.svg` work in both TypeScript and JavaScript projects.
