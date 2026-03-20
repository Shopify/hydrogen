---
'skeleton': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Fix broken `aria-label` on territory code input in address form. The label was the raw developer string `"territoryCode"` instead of a human-readable `"Country code"`.
