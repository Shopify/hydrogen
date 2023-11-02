---
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Fix Shopify login during the init flow where the process would just exit when awaiting for a keypress.
