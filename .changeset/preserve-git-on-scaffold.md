---
"@shopify/cli-hydrogen": patch
"@shopify/create-hydrogen": patch
---

`npm create @shopify/hydrogen` now preserves the `.git/` directory when scaffolding into a non-empty folder, so existing version history isn't lost.
