---
"@shopify/hydrogen": patch
---

Fix `formatMoney().amount` keeping the space that separates the number from the currency symbol, so `19,99 €` in `fr-FR` yields `19,99` instead of `19,99 `. Right-to-left locales such as `he-IL` and `ar-EG` keep the marks that bind the minus sign to the digits and lose the trailing space and mark.
