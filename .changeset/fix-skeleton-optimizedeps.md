---
'skeleton': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Fix `set-cookie-parser` and `cookie` resolution warnings during `dev` by using Vite's nested dependency syntax (`react-router > dep`). These are CJS transitive dependencies of `react-router` that weren't resolvable by bare name with strict package managers like pnpm.
