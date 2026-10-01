---
"@shopify/hydrogen": patch
---

Correct the `formatMoney` `currencyDisplay` docs. The default `'symbol'` is what tells dollar currencies apart (`CA$`, `A$`); `'narrowSymbol'` renders `$` for all of them.
