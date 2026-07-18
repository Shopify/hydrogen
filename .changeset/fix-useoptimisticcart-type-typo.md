---
'@shopify/hydrogen': patch
---

Fixed a typo in `useOptimisticCart`'s default generic type where `merchandise` was typed as `{is: string}` instead of `{id: string}`.
