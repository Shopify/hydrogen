---
'@shopify/cli-hydrogen': patch
---

Fix transpiling TS to JS when scaffolding routes.
Replace `typescript` with `@babel/core` for transpiling TS to JS.
