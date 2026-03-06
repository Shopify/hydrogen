---
'@shopify/cli-hydrogen': patch
---

Added a new `shopify hydrogen build --native-build` flag to run React Router's native build pipeline while preserving Hydrogen build checks and warnings where possible. This gives you an opt-in path to test native React Router build behavior before making it the default.
