---
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

`h2 init --template skeleton` and `npm create @shopify/hydrogen -- --template skeleton` now use the skeleton bundled with the CLI instead of downloading GitHub's latest release, so the new project's dependencies install and scaffolding works offline.
