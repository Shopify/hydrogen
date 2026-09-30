---
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

`h2 init --template <name>` and `npm create @shopify/hydrogen -- --template <name>` now download templates from the Hydrogen release that matches the CLI's bundled skeleton, instead of GitHub's latest release. The latest release can belong to a newer Hydrogen that doesn't include these templates.
