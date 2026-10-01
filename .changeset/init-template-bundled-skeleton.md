---
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

`h2 init --template skeleton` and `npm create @shopify/hydrogen -- --template skeleton` now do the same as leaving the flag out, instead of downloading GitHub's latest release. The new project's dependencies install, its `.env` and name are set up, and every other flag is honoured. Any other template name that isn't `demo-store` or a Git URL fails with an error listing the available templates.
