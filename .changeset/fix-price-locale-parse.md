---
"@shopify/hydrogen": patch
---

Fix price filter parsing for shops whose locale uses a dot as the group separator (e.g. de, nl, tr). Canonical decimal values like `12.5` from serialized URLs and number inputs now parse correctly regardless of shop locale.
