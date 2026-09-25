---
"@shopify/hydrogen": minor
---

Fix `formatMoney().amount` dropping the minus sign for negative amounts, so `-19.99` no longer renders as `19.99`.
