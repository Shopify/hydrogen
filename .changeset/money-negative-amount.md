---
'@shopify/hydrogen-react': patch
'@shopify/hydrogen': patch
---

Fix `useMoney().amount` and `<Money withoutCurrency />` dropping the minus sign for negative amounts, so `-19.99` no longer renders as `19.99`.
