---
'skeleton': patch
'@shopify/hydrogen': patch
---

🐛 Fix issue where customer login does not persist to checkout
✨ Add `customerAccount` option to `createCartHandler`. Where a `?logged_in=true` will be added to the checkoutUrl for cart query if a customer is logged in.
