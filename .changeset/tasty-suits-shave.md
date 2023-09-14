---
'@shopify/hydrogen': patch
---

Relax prop validation on the `getSelectedProductOptions` and `getSelectedProductOptions` utilities to look for member props instead of checking with `instanceof`.
