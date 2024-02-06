---
'skeleton': patch
'@shopify/hydrogen': patch
---

🐛 Fix issue where customer login does not persist to checkout
✨ Add `customerLoggedIn` option to `cart.get()`. Where a `?logged_in=true` will be added to the checkoutUrl if a customer is logged in.
